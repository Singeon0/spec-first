#!/usr/bin/env python3
"""spec-first — time report (bilan) of one workflow, read from its Claude Code session folder.

Usage:
  python3 scripts/bilan.py <session-dir> <wf-id> [--project <root>] [--spec <specId>] [--out <file>]

Reads <session>/workflows/<wf>.json, <session>/subagents/workflows/<wf>/journal.jsonl and the
agent-<id>.jsonl transcripts beside it; with --project, also <root>/.spec-first/ledger/journal.tsv
(written by scripts/suite). None of these files is a stable interface: every field is read with a
fallback, and what could not be read is listed under "unread" instead of stopping the report.

Writes the JSON report to --out, or to <root>/.spec-first/bilans/<specId>-<wf>.json when --project
and --spec are given, else prints it to stdout. Always prints three short lines in French for the
owner (after the JSON when the JSON goes to stdout). Standard library only, Python 3.9+.
No e-mail address ever reaches an output: each one is replaced by <email>.
"""
import collections
import datetime
import glob
import json
import os
import re
import sys

VERSION = 1
EMAIL = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(?:\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}")
SECRET = re.compile(r"\b([A-Za-z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|PASSWD)[A-Za-z0-9_]*)(\s*[=:]\s*)([^\s'\"\x60;&|,)]+)", re.I)
ENV_ASSIGN = re.compile(r"\b([A-Z_][A-Z0-9_]*)=(\S+)")
EFFORTS = ("low", "medium", "high", "xhigh", "max")
LABEL_EFFORT = re.compile(r"\b(low|medium|high|xhigh|max)\b", re.I)
LABEL_MODEL = re.compile(r"\b(opus|sonnet|haiku|fable|mythos)\b", re.I)
PYTEST_SUMMARY = re.compile(r"(?:(\d+) failed, )?(\d+) passed[^\n=]{0,160}? in ([\d.]+)s")
SUITE_VERDICT = re.compile(r"\b(PASS|FAIL)\s+key=(\S+)(?:\s+exit=\S+)?\s+secs=(\d+)")
SUITE_SCRIPT = re.compile(r"(?:^|[\s;&|(\x60\"'/=])(?:[\w.~-]*/)?(?:\.spec-first/bin/)?suite\s+(quick|full|heavy:[^\s;&|)'\"\x60]+|wait)\b")


def redact(s):
    """Masks e-mail addresses and secret-looking assignments; the e-mail pass runs last."""
    if not isinstance(s, str):
        return s
    s = SECRET.sub(lambda m: m.group(1) + m.group(2) + "<masqué>", s)
    if ".env" in s:
        s = ENV_ASSIGN.sub(lambda m: m.group(1) + "=<masqué>", s)
    return EMAIL.sub("<email>", s)


def deep_redact(x):
    if isinstance(x, str):
        return redact(x)
    if isinstance(x, list):
        return [deep_redact(v) for v in x]
    if isinstance(x, dict):
        return {deep_redact(k): deep_redact(v) for k, v in x.items()}
    return x


def ts(v):
    """Epoch seconds from an ISO string or a number (ms or s); None when unreadable."""
    if v is None or isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return v / 1000.0 if v > 1e11 else float(v)
    if isinstance(v, str):
        try:
            s = v.strip().replace("Z", "+00:00")
            s = re.sub(r"\.(\d+)", lambda m: "." + (m.group(1) + "000000")[:6], s, count=1)   # 3.9 wants 3 or 6 digits
            d = datetime.datetime.fromisoformat(s)
            if d.tzinfo is None:
                d = d.replace(tzinfo=datetime.timezone.utc)
            return d.timestamp()
        except Exception:
            try:
                return ts(float(v))
            except Exception:
                return None
    return None


def iso(t):
    if t is None:
        return None
    return datetime.datetime.fromtimestamp(t, datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def mins(sec, nd=1):
    return None if sec is None else round(sec / 60.0, nd)


def fr_min(sec):
    m = sec / 60.0
    if m < 10:
        return ("%.1f" % m).replace(".", ",").replace(",0", "") + " min"
    return "%d min" % round(m)


def g(d, *path, default=None):
    """Tolerant nested get: g(d, 'a', 'b') is d['a']['b'] or default."""
    for p in path:
        if isinstance(d, dict) and p in d:
            d = d[p]
        elif isinstance(d, list) and isinstance(p, int) and -len(d) <= p < len(d):
            d = d[p]
        else:
            return default
    return d


def as_text(content):
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        out = []
        for y in content:
            if isinstance(y, dict):
                out.append(str(y.get("text") or ""))
            elif isinstance(y, str):
                out.append(y)
        return " ".join(out)
    return "" if content is None else str(content)


def first_ts(j):
    for k in ("timestamp", "at", "ts", "time"):
        t = ts(j.get(k)) if isinstance(j, dict) else None
        if t is not None:
            return t
    return None


class Unread:
    def __init__(self):
        self.items = []

    def add(self, msg):
        if msg not in self.items:
            self.items.append(msg)


def read_jsonl(path, unread, what):
    rows, bad = [], 0
    try:
        with open(path, encoding="utf-8", errors="replace") as f:
            for line in f:
                if not line.strip():
                    continue
                try:
                    j = json.loads(line)
                except Exception:
                    bad += 1
                    continue
                if isinstance(j, dict):
                    rows.append(j)
                else:
                    bad += 1
    except FileNotFoundError:
        unread.add("%s absent : %s" % (what, path))
        return None, 0
    except Exception as e:
        unread.add("%s illisible (%s) : %s" % (what, type(e).__name__, path))
        return None, 0
    if bad:
        unread.add("%s : %d ligne(s) illisible(s) ou tronquée(s), ignorée(s) : %s" % (what, bad, path))
    return rows, bad


# ---------------------------------------------------------------- transcript of one agent

def tool_text(name, inp):
    if not isinstance(inp, dict):
        return str(inp or "")
    for k in ("code", "command", "cmd", "script"):
        v = inp.get(k)
        if isinstance(v, str) and v.strip():
            return v
    try:
        return json.dumps(inp, ensure_ascii=False)
    except Exception:
        return str(inp)


def analyze_transcript(rows):
    """Returns the timing facts of one agent transcript (rows already parsed)."""
    first = last = None
    models, efforts = collections.Counter(), collections.Counter()
    pending = {}          # tool_use id -> call
    calls = []            # every real call, closed or not
    current = None        # last real call that got its result: virtual commands attach to it
    for j in rows:
        t = first_ts(j)
        if t is not None:
            first = t if first is None else min(first, t)
            last = t if last is None else max(last, t)
        typ = j.get("type")
        msg = j.get("message") if isinstance(j.get("message"), dict) else {}
        content = msg.get("content")
        virtual = bool(j.get("isVirtual")) or msg.get("model") == "<synthetic>"
        if typ == "api-request":
            e = g(j, "params", "output_config", "effort")
            if isinstance(e, str):
                efforts[e] += 1
            continue
        if typ == "assistant":
            m = msg.get("model")
            if isinstance(m, str) and m and m != "<synthetic>":
                models[m] += 1
            e = j.get("effort")
            if isinstance(e, str) and e:
                efforts[e] += 1
            if not isinstance(content, list):
                continue
            for x in content:
                if not isinstance(x, dict) or x.get("type") != "tool_use":
                    continue
                name = x.get("name") or "?"
                text = tool_text(name, x.get("input"))
                if virtual:
                    if current is not None:
                        current["inner"].append((name, text))
                    continue
                c = {"id": x.get("id"), "tool": name, "start": t, "end": None, "text": text,
                     "inner": [], "result": ""}
                calls.append(c)
                if x.get("id") is not None:
                    pending[x.get("id")] = c
        elif typ == "user" and isinstance(content, list):
            for x in content:
                if not isinstance(x, dict) or x.get("type") != "tool_result":
                    continue
                if virtual:
                    if current is not None:
                        out = g(j, "toolUseResult", "stdout")
                        current["result"] += "\n" + (out if isinstance(out, str) else as_text(x.get("content")))
                    continue
                c = pending.pop(x.get("tool_use_id"), None)
                if c is None:
                    continue
                c["end"] = t
                c["result"] = as_text(x.get("content"))
                current = c
    open_calls = 0
    for c in calls:
        if c["start"] is None:
            c["start"] = c["end"]
        if c["end"] is None:
            open_calls += 1
            c["end"] = last
        if c["start"] is None or c["end"] is None or c["end"] < c["start"]:
            c["start"] = c["end"] = c["start"] or c["end"]
    intervals = union([(c["start"], c["end"]) for c in calls if c["start"] is not None])
    return {"first": first, "last": last, "models": models, "efforts": efforts, "calls": calls,
            "openCalls": open_calls, "toolIntervals": intervals}


def union(iv):
    iv = sorted((a, b) for a, b in iv if a is not None and b is not None and b >= a)
    out = []
    for a, b in iv:
        if out and a <= out[-1][1]:
            out[-1][1] = max(out[-1][1], b)
        else:
            out.append([a, b])
    return out


def span_sum(iv):
    return sum(b - a for a, b in iv)


def overlap(iv, a, b):
    return sum(max(0.0, min(y, b) - max(x, a)) for x, y in iv)


# ---------------------------------------------------------------- phases from labels

PHASE_RULES = [
    (re.compile(r"^Fusion|^Reprise", re.I), "Fusion"),
    (re.compile(r"critique", re.I), "Critique"),
    (re.compile(r"dév|dev\b", re.I), "Développement"),
    (re.compile(r"^Relecteur|^Testeur", re.I), "Revue"),
    (re.compile(r"^Pistes|doublons", re.I), "Pistes"),
    (re.compile(r"^Réparation|^Après réparation", re.I), "Réparation"),
    (re.compile(r"publication", re.I), "Publication"),
    (re.compile(r"contrôle|controle|vérification finale", re.I), "Contrôle"),
]


def phase_from_label(label):
    for rx, name in PHASE_RULES:
        if label and rx.search(label):
            return name
    return None


# ---------------------------------------------------------------- suites

def boundary_rx(cmd):
    """The command as a whole word sequence, not followed by an argument of its own
    (\"make test\" matches \"make test 2>&1 | tail\" but not \"make test T=tests/x.py\")."""
    cmd = cmd.strip()
    if not cmd:
        return None
    body = r"\s+".join(re.escape(p) for p in cmd.split())
    return re.compile(r"(?:^|(?<=[\s;&|(\x60\"'=]))" + body + r"(?=\s*(?:$|[;&|)\x60\"'\n>]|[12]>))", re.M)


def suite_commands(args):
    out = []
    if not isinstance(args, dict):
        return out
    for k in ("testCommand", "quickTestCommand"):
        v = args.get(k)
        if isinstance(v, str) and v.strip():
            out.append((k, v.strip()))
    h = args.get("heavy")
    if isinstance(h, dict):
        for k, v in h.items():
            if isinstance(v, str) and v.strip():
                out.append(("heavy:%s" % k, v.strip()))
    elif isinstance(h, list):
        for i, v in enumerate(h):
            if isinstance(v, str) and v.strip():
                out.append(("heavy:%d" % i, v.strip()))
    elif isinstance(h, str) and h.strip():
        out.append(("heavy", h.strip()))
    seen, uniq = set(), []
    for k, v in out:
        if v not in seen:
            seen.add(v)
            uniq.append((k, v, boundary_rx(v)))
    return uniq


SHELL_TOOL = re.compile(r"bash|shell|terminal|exec_command|run_command", re.I)
SCRIPT_TOOL = re.compile(r"repl|javascript|\bjs\b|node", re.I)
NOT_RUN = re.compile(r"(?:^|/|\s)suite\s+(?:set|reset|key|list)\b")
HEREDOC = re.compile(r"(^|\n)([^\n]*?)<<-?\s*(['\"]?)([A-Za-z_][A-Za-z0-9_]*)\3([^\n]*)\n(.*?)\n[ \t]*\4[ \t]*(?=\n|$)", re.S)
FEEDS_SHELL = re.compile(r"(?:^|[\s|;&(])(?:bash|sh|zsh|dash)(?:\s+-\w+)*\s*$")


def shell_calls_in_js(code):
    """The shell commands a REPL script hands to its shell: the text of $`…` templates and of
    $("…") / $('…') / $(`…`) calls, interpolations replaced by X. Everything else of the
    JavaScript (edit(), write(), strings, comments) is not run by a shell and is ignored."""
    out, n, i = [], len(code), 0

    def ident_before(k):           # $ glued to a name (foo$, a.$) is not the shell function
        return k > 0 and (code[k - 1].isalnum() or code[k - 1] in "_.$")

    def skip_string(k):            # code[k] is a quote; returns (text, index after it)
        q, k, buf = code[k], k + 1, []
        while k < n and code[k] != q:
            if code[k] == "\\" and k + 1 < n:
                buf.append(code[k + 1])
                k += 2
                continue
            if code[k] == "\n":
                break
            buf.append(code[k])
            k += 1
        return "".join(buf), k + 1

    def skip_template(k):          # code[k] is a backtick
        k, buf = k + 1, []
        while k < n and code[k] != "\x60":
            if code[k] == "\\" and k + 1 < n:
                buf.append(code[k + 1])
                k += 2
            elif code.startswith("${", k):
                k = skip_expr(k + 2)
                buf.append("X")
            else:
                buf.append(code[k])
                k += 1
        return "".join(buf), k + 1

    def skip_expr(k):              # inside ${ … }: returns the index after the closing brace
        depth = 1
        while k < n and depth:
            c = code[k]
            if c in "'\"":
                k = skip_string(k)[1]
                continue
            if c == "\x60":
                k = scan_template_at(k)
                continue
            if c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
            k += 1
        return k

    def scan_template_at(k):       # a template inside an expression; a $-tagged one is a shell call
        tagged = k > 0 and code[k - 1] == "$" and not ident_before(k - 1)
        text, k2 = skip_template(k)
        if tagged:
            out.append(text)
        return k2

    while i < n:
        c = code[i]
        if code.startswith("//", i):
            j = code.find("\n", i)
            i = n if j < 0 else j + 1
        elif code.startswith("/*", i):
            j = code.find("*/", i + 2)
            i = n if j < 0 else j + 2
        elif c in "'\"":
            i = skip_string(i)[1]
        elif c == "\x60":
            i = scan_template_at(i)
        elif c == "$" and not ident_before(i):
            j = i + 1
            while j < n and code[j] in " \t":
                j += 1
            if j < n and code[j] == "(":
                k = j + 1
                while k < n and code[k] in " \t\n":
                    k += 1
                if k < n and code[k] in "'\"":
                    text, i = skip_string(k)
                    out.append(text)
                    continue
                if k < n and code[k] == "\x60":
                    text, i = skip_template(k)
                    out.append(text)
                    continue
            i += 1
        else:
            i += 1
    return out


def neutralize(cmd):
    """Removes from a shell command what it does not run: heredoc bodies written to a file or to
    « suite set » (kept when fed to a shell), and the segments that only record or list suites."""
    def heredoc(m):
        head = m.group(2)
        before = head[:head.rfind("<<")] if "<<" in head else head
        if FEEDS_SHELL.search(before):
            return m.group(0)
        return m.group(1) + head + "<<" + m.group(4) + m.group(5)
    cmd = HEREDOC.sub(heredoc, cmd)
    kept = []
    for line in cmd.split("\n"):
        parts = re.split(r"(&&|\|\||;)", line)
        segs = [p for p in parts[0::2] if not NOT_RUN.search(p)]
        kept.append(" ; ".join(s for s in segs if s.strip()))
    return "\n".join(kept)


def executed(call):
    """The shell commands a call really ran. Shell tools (Bash): their command. Script tools
    (REPL): the shell commands recorded inside the call when there are records, else the shell
    calls written in the script ($`…`, $(\"…\")). Any other tool (Write, Edit, StructuredOutput…)
    carries prose or file content and ran nothing."""
    tool = call["tool"] or ""
    if SHELL_TOOL.search(tool) and not SCRIPT_TOOL.search(tool):
        texts = [call["text"]]
    elif SCRIPT_TOOL.search(tool):
        if call["inner"]:
            texts = [t for name, t in call["inner"] if SHELL_TOOL.search(name or "")]
        else:
            texts = shell_calls_in_js(call["text"])
    else:
        texts = []
    return [neutralize(t) for t in texts if isinstance(t, str)]


def find_suites(call, cmds):
    texts = executed(call)
    matched = []
    for t in texts:
        for m in SUITE_SCRIPT.finditer(t):
            name = "suite " + m.group(1)
            if name not in matched:
                matched.append(name)
        for k, v, rx in cmds:
            if rx is not None and rx.search(t) and v not in matched:
                matched.append(v)
    return matched


def summaries_in(result):
    """Test-run summaries written by the runner itself: [(tests, seconds, failed)]."""
    out = []
    for m in PYTEST_SUMMARY.finditer(result or ""):
        out.append((int(m.group(2)) + int(m.group(1) or 0), float(m.group(3)), int(m.group(1) or 0) > 0))
    return out


def agent_suites(label, aid, calls, cmds):
    """Whole-suite launches of one agent, each with its duration when the runner's own summary
    (pytest « N passed in Xs », suite « PASS key=… secs=N ») shows up in a later result of the
    same agent — suites are often started in the background and read from their log later."""
    launches, summaries, seen = [], [], set()
    for c in calls:
        matched = find_suites(c, cmds)
        res = c["result"] or ""
        verdicts = [(float(m.group(3)), m.group(1)) for m in SUITE_VERDICT.finditer(res)]
        if matched and matched != ["suite wait"]:
            launches.append({"agent": label, "agentId": aid, "at": iso(c["start"]), "_t": c["start"],
                             "callMinutes": mins((c["end"] or 0) - (c["start"] or 0), 2), "matched": matched,
                             "suiteSeconds": None, "outcome": None, "joined": bool(re.search(r"\bJOINED key=", res)),
                             "readFromLedger": bool(re.search(r"^PASS key=|^FAIL key=", res, re.M)) and not re.search(r"\bSTARTED key=", res)})
        for secs, verdict in verdicts:
            summaries.append((c["start"], None, secs, verdict != "PASS", "suite"))
        for n, secs, failed in summaries_in(res):
            if (n, secs) in seen:
                continue
            seen.add((n, secs))
            summaries.append((c["start"], n, secs, failed, "runner"))
    return launches, summaries


def attach_summaries(launches, summaries, whole_n):
    """Gives each summary to the latest launch of the same agent, at or before it, still without one.
    A runner summary counts only when its number of tests is at least half the largest seen in the
    workflow (a targeted run of a few files is not the whole suite)."""
    leftovers = []
    for t, n, secs, failed, kind in sorted(summaries, key=lambda s: s[0] or 0):
        if kind == "runner" and whole_n and (n or 0) < whole_n / 2.0:
            continue
        cands = [l for l in launches if l["suiteSeconds"] is None and (l["_t"] or 0) <= (t or 0)]
        if cands:
            l = cands[-1]
            l["suiteSeconds"] = round(secs, 1)
            l["outcome"] = "échec" if failed else "réussite"
            if n:
                l["tests"] = n
        else:
            leftovers.append({"at": iso(t), "tests": n, "seconds": round(secs, 1), "failed": failed})
    return leftovers


def read_ledger(root, t0, t1, unread):
    path = os.path.join(root, ".spec-first", "ledger", "journal.tsv")
    if not os.path.exists(path):
        unread.add("registre des suites absent : %s" % path)
        return None
    counts = collections.Counter()
    run_secs, bad, keys_run = 0, 0, collections.Counter()
    by_suite = collections.defaultdict(lambda: collections.Counter())
    try:
        with open(path, encoding="utf-8", errors="replace") as f:
            for line in f:
                p = line.rstrip("\n").split("\t")
                if len(p) < 3:
                    if line.strip():
                        bad += 1
                    continue
                try:
                    e = float(p[0])
                except Exception:
                    bad += 1
                    continue
                if t0 is not None and t1 is not None and not (t0 - 120 <= e <= t1 + 120):
                    continue
                ev, key = p[1], p[2]
                counts[ev] += 1
                suite = key.rsplit("-", 2)[0] if key.count("-") >= 2 else key
                by_suite[suite][ev] += 1
                if ev == "run":
                    keys_run[key] += 1
                    try:
                        run_secs += float(p[4]) if len(p) > 4 and p[4] else 0
                    except Exception:
                        bad += 1
    except Exception as e:
        unread.add("registre des suites illisible (%s) : %s" % (type(e).__name__, path))
        return None
    if bad:
        unread.add("registre des suites : %d ligne(s) illisible(s) : %s" % (bad, path))
    return {"path": path, "window": [iso(t0), iso(t1)], "run": counts.get("run", 0), "read": counts.get("read", 0),
            "join": counts.get("join", 0), "lost": counts.get("lost", 0), "runMinutes": mins(run_secs),
            "bySuite": {k: dict(v) for k, v in sorted(by_suite.items())},
            "sameKeyRunMoreThanOnce": {k: n for k, n in keys_run.items() if n > 1}}


# ---------------------------------------------------------------- main report

def find_wf(session, wf, unread):
    p = os.path.join(session, "workflows", wf + ".json")
    sub = os.path.join(session, "subagents", "workflows", wf)
    if os.path.exists(p) or os.path.isdir(sub):
        return wf
    cands = sorted({os.path.basename(x)[:-5] for x in glob.glob(os.path.join(session, "workflows", wf + "*.json"))} |
                   {os.path.basename(x) for x in glob.glob(os.path.join(session, "subagents", "workflows", wf + "*"))})
    if len(cands) == 1:
        return cands[0]
    if len(cands) > 1:
        unread.add("identifiant de workflow ambigu « %s » : %s" % (wf, ", ".join(cands)))
    return wf


def build(session, wf, project=None, spec=None):
    unread = Unread()
    wf = find_wf(session, wf, unread)
    meta_path = os.path.join(session, "workflows", wf + ".json")
    sub = os.path.join(session, "subagents", "workflows", wf)
    meta = {}
    try:
        with open(meta_path, encoding="utf-8", errors="replace") as f:
            meta = json.load(f)
        if not isinstance(meta, dict):
            unread.add("fichier du workflow sans objet JSON : %s" % meta_path)
            meta = {}
    except FileNotFoundError:
        unread.add("fichier du workflow absent : %s" % meta_path)
    except Exception as e:
        unread.add("fichier du workflow illisible (%s) : %s" % (type(e).__name__, meta_path))
    args = meta.get("args") if isinstance(meta.get("args"), dict) else {}

    # progress entries of the workflow file: queue time, phase, model
    prog = {}
    for x in meta.get("workflowProgress") or []:
        if isinstance(x, dict) and x.get("type") == "workflow_agent" and x.get("agentId"):
            prog[x["agentId"]] = x

    # journal: labels, phases, legs
    journal, _ = read_jsonl(os.path.join(sub, "journal.jsonl"), unread, "journal du workflow")
    agents = collections.OrderedDict()
    legs_declared = 0
    leg = 0
    for j in journal or []:
        typ = j.get("type")
        if typ == "launched":
            legs_declared += 1
            leg = legs_declared
        elif typ == "started" and j.get("agentId"):
            a = agents.setdefault(j["agentId"], {"id": j["agentId"]})
            a.setdefault("label", j.get("label"))
            a.setdefault("phase", j.get("phase"))
            a.setdefault("leg", max(leg, 1))
            a.setdefault("queuedAt", first_ts(j))
            a["startedInJournal"] = a.get("startedInJournal", 0) + 1
        elif typ == "result" and j.get("agentId"):
            agents.setdefault(j["agentId"], {"id": j["agentId"]})["resultInJournal"] = True
    for aid, x in prog.items():
        a = agents.setdefault(aid, {"id": aid})
        if not a.get("label"):
            a["label"] = x.get("label")
        if not a.get("phase"):
            a["phase"] = x.get("phaseTitle")
        if a.get("queuedAt") is None:
            a["queuedAt"] = ts(x.get("queuedAt"))
        a["declaredStart"] = ts(x.get("startedAt"))
        a["declaredModel"] = x.get("model")
        a["state"] = x.get("state")
    files = sorted(glob.glob(os.path.join(sub, "agent-*.jsonl")))
    for p in files:
        aid = os.path.basename(p)[len("agent-"):-len(".jsonl")]
        agents.setdefault(aid, {"id": aid})["path"] = p
    if not os.path.isdir(sub):
        unread.add("dossier des sous-agents absent : %s" % sub)

    cmds = suite_commands(args)
    suite_found = []
    out_agents = []
    analyses = {}
    for aid, a in agents.items():
        label = a.get("label") or ("agent " + aid[:8])
        if not a.get("label"):
            unread.add("agent %s : pas de libellé dans le journal ni dans le fichier du workflow" % aid[:12])
        p = a.get("path") or os.path.join(sub, "agent-%s.jsonl" % aid)
        rows, bad = read_jsonl(p, unread, "transcription de « %s »" % label)
        r = analyze_transcript(rows) if rows else None
        if rows is not None and (r is None or r["first"] is None):
            unread.add("transcription de « %s » sans horodatage lisible" % label)
            r = None
        analyses[aid] = r
        phase = a.get("phase") or phase_from_label(label) or "inconnue"
        model = (r and r["models"].most_common(1) and r["models"].most_common(1)[0][0]) or a.get("declaredModel")
        if not model:
            m = LABEL_MODEL.search(label)
            model = m.group(1).lower() if m else None
        effort = r and r["efforts"].most_common(1) and r["efforts"].most_common(1)[0][0]
        if not effort:
            m = LABEL_EFFORT.search(label)
            effort = m.group(1).lower() if m else None
        start = r["first"] if r else a.get("declaredStart")
        end = r["last"] if r else None
        q = a.get("queuedAt")
        entry = {"id": aid, "label": label, "phase": phase, "leg": a.get("leg", 1), "model": model, "effort": effort or None,
                 "state": a.get("state"), "queuedAt": iso(q), "start": iso(start), "end": iso(end),
                 "minutes": mins(end - start) if (start is not None and end is not None) else None,
                 "queueMinutes": mins(max(0.0, start - q), 2) if (q is not None and r) else None,
                 "commandMinutes": None, "modelMinutes": None, "calls": None, "unfinishedCalls": None,
                 "longestCommands": [], "transcript": "ok" if r else ("absente" if rows is None else "inexploitable"),
                 "badLines": bad}
        if r:
            tool = span_sum(r["toolIntervals"])
            entry["commandMinutes"] = mins(tool)
            entry["modelMinutes"] = mins(max(0.0, (end - start) - tool))
            entry["calls"] = len(r["calls"])
            entry["unfinishedCalls"] = r["openCalls"]
            top = sorted(r["calls"], key=lambda c: -((c["end"] or 0) - (c["start"] or 0)))[:3]
            entry["longestCommands"] = [{"minutes": mins((c["end"] or 0) - (c["start"] or 0), 2), "tool": c["tool"],
                                         "at": iso(c["start"]),
                                         "excerpt": re.sub(r"\s+", " ", redact(c["text"])).strip()[:200]} for c in top]
            ls, ss = agent_suites(label, aid, r["calls"], cmds)
            suite_found.append((label, ls, ss))
        entry["_start"], entry["_end"] = start, end
        out_agents.append(entry)
    out_agents.sort(key=lambda e: (e["_start"] is None, e["_start"] or 0))

    timed = [e for e in out_agents if e["_start"] is not None and e["_end"] is not None]
    t0 = min((e["_start"] for e in timed), default=None)
    t1 = max((e["_end"] for e in timed), default=None)

    # legs
    legs = []
    for k in sorted({e["leg"] for e in timed}):
        es = [e for e in timed if e["leg"] == k]
        a, b = min(e["_start"] for e in es), max(e["_end"] for e in es)
        legs.append({"index": k, "start": iso(a), "end": iso(b), "minutes": mins(b - a), "agents": len(es), "_a": a, "_b": b})
    if legs_declared == 0 and journal is not None:
        unread.add("journal sans ligne « launched » : une seule étape supposée")
    wall_secs = sum(l["_b"] - l["_a"] for l in legs)

    # phases
    phases = []
    by_phase = collections.OrderedDict()
    for e in timed:
        by_phase.setdefault(e["phase"], []).append(e)
    for name, es in by_phase.items():
        a, b = min(e["_start"] for e in es), max(e["_end"] for e in es)
        phases.append({"name": name, "start": iso(a), "end": iso(b), "minutes": mins(b - a), "agents": len(es),
                       "agentMinutes": mins(sum(e["_end"] - e["_start"] for e in es)), "_a": a})
    phases.sort(key=lambda p: p["_a"])
    phase_start = {p["name"]: p["_a"] for p in phases}

    # who started at the end of whom (waits inside a phase)
    for e in timed:
        delay = e["_start"] - phase_start.get(e["phase"], e["_start"])
        e["startAfterPhaseStartMinutes"] = mins(delay)
        prev = [o for o in timed if o is not e and o["_end"] <= e["_start"] + 5 and o["_end"] >= e["_start"] - 30
                and o["phase"] == e["phase"]]
        p = max(prev, key=lambda o: o["_end"]) if (prev and delay > 60) else None
        e["startedAtEndOf"] = p["label"] if p else None
        # one after the other: same role (labels equal but for numbers) and it began when the other ended
        same = p is not None and role(p["label"]) == role(e["label"]) and retry_key(p["label"]) != retry_key(e["label"])
        e["serializedAfter"] = p["label"] if same else None
        e["waitedForSiblingMinutes"] = mins(min(e["_start"] - p["_start"], delay)) if same else None
    for e in out_agents:
        for k in ("startAfterPhaseStartMinutes", "startedAtEndOf", "serializedAfter", "waitedForSiblingMinutes"):
            e.setdefault(k, None)

    # concurrency, minute by minute
    conc = None
    if timed:
        n = int((t1 - t0) // 60) + 1
        in_cmd, active = [0.0] * n, [0.0] * n
        for e in timed:
            r = analyses.get(e["id"])
            iv = r["toolIntervals"] if r else []
            for i in range(int((e["_start"] - t0) // 60), min(n, int((e["_end"] - t0) // 60) + 1)):
                a, b = t0 + 60 * i, t0 + 60 * (i + 1)
                act = max(0.0, min(b, e["_end"]) - max(a, e["_start"]))
                active[i] += act
                in_cmd[i] += min(act, overlap(iv, a, b))
        per = [[i, round(in_cmd[i] / 60, 2), round((active[i] - in_cmd[i]) / 60, 2)] for i in range(n)]
        evs, evc = [], []
        for e in timed:
            evs += [(e["_start"], 1), (e["_end"], -1)]
            r = analyses.get(e["id"])
            for a, b in (r["toolIntervals"] if r else []):
                evc += [(a, 1), (b, -1)]

        def peak(ev):
            cur = best = 0
            for _, d in sorted(ev, key=lambda x: (x[0], x[1])):
                cur += d
                best = max(best, cur)
            return best
        tot_active = sum(e["_end"] - e["_start"] for e in timed)
        tot_cmd = sum(span_sum(analyses[e["id"]]["toolIntervals"]) for e in timed if analyses.get(e["id"]))
        conc = {"start": iso(t0), "minuteStep": 1, "columns": ["minute", "agentsInCommand", "agentsThinking"],
                "perMinute": per,
                "averageInCommand": round(tot_cmd / wall_secs, 2) if wall_secs else None,
                "averageThinking": round((tot_active - tot_cmd) / wall_secs, 2) if wall_secs else None,
                "effectiveParallelism": round(tot_active / wall_secs, 2) if wall_secs else None,
                "peakActive": peak(evs), "peakInCommand": peak(evc),
                "commandShareOfAgentTime": round(tot_cmd / tot_active, 3) if tot_active else None,
                "note": "parallélisme effectif = somme des durées d'agents / durée murale des étapes"}

    # suites
    whole_n = max([n for _, _, ss in suite_found for _, n, _, _, k in ss if k == "runner"] or [0])
    suite_runs, unmatched = [], []
    for label, ls, ss in suite_found:
        for x in attach_summaries(ls, ss, whole_n):
            x["agent"] = label
            unmatched.append(x)
        suite_runs += ls
    suite_runs.sort(key=lambda s: s["_t"] or 0)
    for s in suite_runs:
        s.pop("_t", None)
        s["minutes"] = round(s["suiteSeconds"] / 60.0, 1) if s["suiteSeconds"] is not None else s["callMinutes"]
        s["minutesFrom"] = "runner" if s["suiteSeconds"] is not None else "call"
    by_cmd = collections.OrderedDict()
    for s in suite_runs:
        for m in s["matched"]:
            b = by_cmd.setdefault(m, {"runs": 0, "minutes": 0.0, "agents": collections.Counter()})
            b["runs"] += 1
            b["minutes"] += s["minutes"] or 0
            b["agents"][s["agent"]] += 1
    suites = {"commandsLookedFor": [v for _, v, _ in cmds] + ["suite quick|full|heavy:<id>|wait"],
              "runs": suite_runs, "totalRuns": len(suite_runs),
              "totalMinutes": round(sum(s["minutes"] or 0 for s in suite_runs), 1),
              "byCommand": {k: {"runs": v["runs"], "minutes": round(v["minutes"], 1), "agents": dict(v["agents"])}
                            for k, v in by_cmd.items()},
              "wholeSuiteTests": whole_n or None,
              "summariesWithoutLaunch": unmatched,
              "note": "un lancement = un appel qui exécute la commande de suite (sans argument en plus) ou « suite quick|full|heavy » ; "
                      "minutes = durée écrite par la suite elle-même quand un résultat ultérieur du même agent la montre "
                      "(minutesFrom=runner), sinon durée de l'appel (minutesFrom=call, sous-estimée si la suite tournait en fond). "
                      "summariesWithoutLaunch : bilans de suite lus par un agent qui ne l'avait pas lancée (journal partagé) ou sans lancement repéré",
              "ledger": None}
    if not cmds:
        unread.add("aucune commande de test dans les arguments du workflow (testCommand, quickTestCommand, heavy) : seules les lignes « suite … » sont comptées")
    if project:
        suites["ledger"] = read_ledger(project, t0, t1, unread)

    # critical path (estimate)
    crit = None
    if timed:
        cur = max(timed, key=lambda e: e["_end"])
        chain = []
        seen = set()
        while cur is not None and cur["id"] not in seen:
            seen.add(cur["id"])
            prev = [o for o in timed if o["id"] not in seen and o["_end"] <= cur["_start"] + 5]
            p = max(prev, key=lambda o: o["_end"]) if prev else None
            gap = (cur["_start"] - p["_end"]) if p else (cur["_start"] - t0)
            chain.append({"agent": cur["label"], "phase": cur["phase"], "start": iso(cur["_start"]), "end": iso(cur["_end"]),
                          "minutes": mins(cur["_end"] - cur["_start"]), "gapBeforeMinutes": mins(max(0.0, gap))})
            cur = p
        chain.reverse()
        agent_secs = sum((e["minutes"] or 0) * 60 for e in chain)
        crit = {"estimate": True,
                "method": "en remontant depuis l'agent qui finit le dernier, à chaque pas l'agent qui finit au plus près avant le début du suivant ; "
                          "une dépendance n'est pas prouvée par les données, seulement suggérée par l'enchaînement",
                "chain": chain, "agentMinutes": mins(agent_secs),
                "gapMinutes": round(sum(c["gapBeforeMinutes"] or 0 for c in chain), 1),
                "shareOfWall": round(agent_secs / wall_secs, 3) if wall_secs else None}

    for e in out_agents:
        e.pop("_start", None)
        e.pop("_end", None)
    for l in legs:
        l.pop("_a", None)
        l.pop("_b", None)
    for p in phases:
        p.pop("_a", None)

    declared = g(meta, "durationMs")
    report = {
        "tool": "spec-first bilan", "version": VERSION,
        "workflow": {"id": wf, "name": meta.get("workflowName"), "status": meta.get("status"), "spec": spec,
                     "session": session, "agents": len(out_agents),
                     "testCommands": {k: v for k, v, _ in cmds}},
        "wall": {"start": iso(t0), "end": iso(t1), "minutes": mins(wall_secs) if timed else None,
                 "spanMinutes": mins(t1 - t0) if timed else None, "legs": legs,
                 "declaredLastLegMinutes": mins(declared / 1000.0) if isinstance(declared, (int, float)) else None,
                 "note": "minutes = somme des étapes, du premier début d'agent à la dernière fin d'agent de chaque étape"},
        "phases": phases, "agents": out_agents, "concurrency": conc, "suites": suites, "criticalPath": crit,
        "unread": unread.items,
    }
    if not timed:
        unread.add("aucun agent avec des horodatages lisibles : pas de durées")
    report["summary"] = summary(report)
    return deep_redact(report)


def nb(n, one, many):
    """French count: 0 and 1 take the singular."""
    return "%d %s" % (n, one if n <= 1 else many)


def summary(r):
    agents = [a for a in r["agents"] if a["minutes"] is not None]
    if not agents:
        return ["Bilan impossible : aucune transcription d'agent lisible pour ce workflow.",
                "Ce qui manque : " + " ; ".join(r["unread"][:3]) if r["unread"] else "Rien d'autre à signaler.",
                "Rien à compter sur les suites de tests."]
    w = r["wall"]
    legs = w["legs"]
    head = "Durée totale %s" % fr_min(w["minutes"] * 60)
    if len(legs) > 1:
        head += " en %d étapes (%s)" % (len(legs), ", ".join(fr_min(l["minutes"] * 60) for l in legs))
    phs = r["phases"]
    overlapping = sum(p["minutes"] for p in phs) > w["minutes"] * 1.05
    if overlapping:   # phases run side by side: their agent time says more than their span
        ph = "temps cumulé des agents " + ", ".join("%s %s" % (p["name"], fr_min(p["agentMinutes"] * 60))
                                                    for p in sorted(phs, key=lambda p: -p["agentMinutes"])[:5])
    else:
        ph = ", ".join("%s %s" % (p["name"], fr_min(p["minutes"] * 60)) for p in phs[:5])
    c = r["concurrency"] or {}
    share = c.get("commandShareOfAgentTime")
    l1 = head + (" : " + ph if ph else "")
    if share is not None:
        l1 += " ; les agents ont passé %d %% de leur temps dans des commandes, le reste à réfléchir." % round(share * 100)
    else:
        l1 += "."

    waits = sorted([a for a in agents if a.get("serializedAfter") and (a.get("waitedForSiblingMinutes") or 0) >= 1],
                   key=lambda a: -(a["waitedForSiblingMinutes"] or 0))
    parts = []
    if waits:
        parts.append("%s %s qu'à la fin d'un autre du même rôle, la plus longue attente : « %s » a attendu « %s » %s"
                     % (nb(len(waits), "agent", "agents"), "n'a démarré" if len(waits) == 1 else "n'ont démarré",
                        short(waits[0]["label"]), short(waits[0]["serializedAfter"]),
                        fr_min(waits[0]["waitedForSiblingMinutes"] * 60)))
    q = [a for a in agents if (a.get("queueMinutes") or 0) >= 1]
    if q:
        worst = max(q, key=lambda a: a["queueMinutes"])
        parts.append("%s d'attente en file au total, dont %s pour « %s »"
                     % (fr_min(sum(a["queueMinutes"] for a in q) * 60), fr_min(worst["queueMinutes"] * 60), short(worst["label"])))
    if c.get("effectiveParallelism") is not None:
        avg = c["effectiveParallelism"]
        parts.append("en moyenne %s %s au travail à la fois, au plus %d"
                     % (("%.1f" % avg).replace(".", ","), "agent" if avg < 2 else "agents", c.get("peakActive") or 0))
    l2 = "Ce qui a attendu : " + (" ; ".join(parts) if parts else "aucune attente visible") + "."

    s = r["suites"]
    parts = []
    if s["totalRuns"]:
        top = sorted(s["byCommand"].items(), key=lambda kv: -kv[1]["minutes"])[:2]
        parts.append("%s %d fois, %s en tout (%s)" % (
            "suite de tests complète lancée" if s["totalRuns"] == 1 else "suites de tests complètes lancées",
            s["totalRuns"], fr_min(s["totalMinutes"] * 60),
            ", ".join("%s : %d fois, %s" % (k, v["runs"], fr_min(v["minutes"] * 60)) for k, v in top)))
    else:
        parts.append("aucune suite de tests complète repérée")
    led = s.get("ledger")
    if led:
        parts.append("registre : %s, %s d'un résultat déjà là, %s d'un run en cours%s"
                     % (nb(led["run"], "exécution", "exécutions"), nb(led["read"], "lecture", "lectures"),
                        nb(led["join"], "attente", "attentes"),
                        (", " + nb(led["lost"], "perdue", "perdues")) if led["lost"] else ""))
    retries = [a for a in agents if re.search(r"\bessai\s*([2-9]|\d\d)", a["label"] or "", re.I)]
    if retries:
        parts.append("%s (essai 2 ou plus) pour %s"
                     % (nb(len(retries), "agent refait", "agents refaits"), fr_min(sum(a["minutes"] for a in retries) * 60)))
    l3 = "Ce qui a tourné plusieurs fois : " + " ; ".join(parts) + "."
    return [l1, l2, l3]


def retry_key(label):
    return re.sub(r"\bessai\s*\d+", "essai", re.sub(r"\s*\([^()]*\)\s*$", "", label or ""), flags=re.I).strip().lower()


def role(label):
    s = re.sub(r"\s*\([^()]*\)\s*$", "", label or "")
    return re.sub(r"\d+", "#", s).strip().lower()


def short(label):
    label = re.sub(r"\s*\((?:[^()]*)\)\s*$", "", label or "").strip()
    return label[:60]


def main(argv):
    pos, opts = [], {}
    i = 0
    while i < len(argv):
        a = argv[i]
        if a in ("--project", "--spec", "--out"):
            if i + 1 >= len(argv):
                sys.stderr.write("option %s sans valeur\n" % a)
                return 2
            opts[a[2:]] = argv[i + 1]
            i += 2
        elif a in ("-h", "--help"):
            sys.stdout.write(__doc__)
            return 0
        else:
            pos.append(a)
            i += 1
    if len(pos) != 2:
        sys.stderr.write("usage: python3 scripts/bilan.py <session-dir> <wf-id> [--project <root>] [--spec <specId>] [--out <file>]\n")
        return 2
    session, wf = os.path.abspath(pos[0]), pos[1]
    if not os.path.isdir(session):
        sys.stderr.write("dossier de session absent : %s\n" % session)
        return 2
    project = os.path.abspath(opts["project"]) if opts.get("project") else None
    spec = opts.get("spec")
    report = build(session, wf, project, spec)
    text = json.dumps(report, ensure_ascii=False, indent=1)
    out = opts.get("out")
    if not out and project and spec:
        safe = re.sub(r"[^A-Za-z0-9._-]+", "_", spec) + "-" + re.sub(r"[^A-Za-z0-9._-]+", "_", report["workflow"]["id"])
        out = os.path.join(project, ".spec-first", "bilans", safe + ".json")
    if out:
        os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
        tmp = out + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            f.write(text + "\n")
        os.replace(tmp, out)
    else:
        sys.stdout.write(text + "\n")
    for line in report["summary"]:
        sys.stdout.write(redact(line) + "\n")
    if out:
        sys.stdout.write(redact("Bilan écrit dans %s" % out) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
