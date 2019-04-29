import { shallowMount, mount } from '@vue/test-utils'
import Orders from '@/core_components/Orders/Orders.vue'
import Vue from 'vue'
Vue.component('OrdersSide', require('@/core_components/Orders/OrdersSide.vue').default)

describe('Orders.vue', () => {
  it('Simple test', () => {
    const wrapper = mount(Orders, {
      propsData: {
        widget: {
          demo: true,
          type: 'both'
        }
      }
    })
    expect(wrapper.contains('button')).toBe(true)
  })
})
