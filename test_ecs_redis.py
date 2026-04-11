import redis

# 👉 配置
HOST = "101.200.57.146"
PORT = 6379
PASSWORD = "YourStrongPassword"
DB = 1

TEST_KEY = "__test__"

try:
    r = redis.Redis(
        host=HOST,
        port=PORT,
        password=PASSWORD,
        db=DB,
        socket_timeout=5,
        socket_connect_timeout=5,
        decode_responses=True,
    )

    # 1️⃣ 连接测试
    r.ping()

    # 2️⃣ 读写测试
    r.set(TEST_KEY, "ok")
    val = r.get(TEST_KEY)
    r.delete(TEST_KEY)

    if val == "ok":
        print("SUCCESS")
    else:
        print(f"FAILED: value mismatch -> {val}")

except Exception as e:
    print("FAILED:")
    print(e)