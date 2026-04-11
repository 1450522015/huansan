import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    用户名: { type: String, required: true, unique: true, trim: true },
    密码哈希: { type: String, required: true },
    配置: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    创建时间: { type: Date, default: Date.now },
    最近登录时间: { type: Date, default: null },
  },
  { collection: 'users' }
)

export const User = mongoose.models.User || mongoose.model('User', userSchema)
