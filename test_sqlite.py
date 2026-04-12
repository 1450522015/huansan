"""
连通性自检：打开与 Node 相同的 SQLite 文件（WAL 下可与服务并行只读）。
环境变量 SQLITE_PATH：可选，默认 仓库根目录 data/huansan.sqlite
"""
import os
import sqlite3
from pathlib import Path

root = Path(__file__).resolve().parent
default_db = root / "data" / "huansan.sqlite"
path = os.environ.get("SQLITE_PATH", "").strip() or str(default_db)
p = Path(path)
if not p.is_file():
    print("SKIP: 库文件不存在，请先启动一次 node 服务:", path)
    raise SystemExit(0)

try:
    conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True, timeout=10)
    conn.execute("PRAGMA busy_timeout=8000")
    (n,) = conn.execute(
        "SELECT COUNT(*) FROM sqlite_schema WHERE type='table' AND name='users'"
    ).fetchone()
    conn.close()
    if n == 1:
        print("SUCCESS:", path)
    else:
        print("FAILED: users 表不存在，请先启动一次 node 服务以建表")
except Exception as e:
    print("FAILED:", path)
    print(e)
