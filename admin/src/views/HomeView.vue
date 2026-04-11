<template>
  <div class="card">
    <h2 style="margin-top: 0">管理首页</h2>
    <p class="muted">
      本后台无需登录，仅建议在可信网络使用。端口与接口地址由仓库根目录 <code>.env</code> 中的
      <code>VUE3_ADMIN_PORT</code>、<code>NODEJS_*</code> 等配置。
    </p>
    <p class="muted">请从左侧进入「用户管理」查看注册用户、登录情况并支持重置密码。</p>
  </div>
</template>

<script setup>
</script>

<style scoped>
.muted {
  color: var(--text-muted);
  line-height: 1.6;
  font-size: 14px;
}
code {
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
}
</style>
