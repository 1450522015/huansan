import { createRouter, createWebHistory } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import HomeView from '@/views/HomeView.vue'
import UserManageView from '@/views/UserManageView.vue'
import BattleManageView from '@/views/BattleManageView.vue'
import WaitingBattleView from '@/views/WaitingBattleView.vue'
import AiOpponentView from '@/views/AiOpponentView.vue'
import AttrCalcView from '@/views/AttrCalcView.vue'
import EngineInitView from '@/views/EngineInitView.vue'
import EngineCalcView from '@/views/EngineCalcView.vue'

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: AdminLayout,
      children: [
        { path: '', name: 'home', component: HomeView, meta: { title: '首页' } },
        { path: 'users', name: 'users', component: UserManageView, meta: { title: '用户管理' } },
        { path: 'battles', name: 'battles', component: BattleManageView, meta: { title: '战局管理' } },
        { path: 'waiting', name: 'waiting', component: WaitingBattleView, meta: { title: '战局等候列表' } },
        { path: 'ai-opponents', name: 'ai-opponents', component: AiOpponentView, meta: { title: '电脑人机' } },
        { path: 'attr-calc', name: 'attr-calc', component: AttrCalcView, meta: { title: '属性计算' } },
        { path: 'engine-init', name: 'engine-init', component: EngineInitView, meta: { title: '战局初始化' } },
        { path: 'engine-calc', name: 'engine-calc', component: EngineCalcView, meta: { title: '战局计算' } },
      ],
    },
  ],
})
