import Vue from 'vue'

import Candles from './core_components/Candles/Candles.vue'
import Handsontable from './core_components/Handsontable/Handsontable.vue'
import Grid from 'vue-grid-canvas'
import GridCanvas from './core_components/GridCanvas/GridCanvas.vue'
import KupiTable from './core_components/KupiTable/KupiTable.vue'
import Market from './utils_components/Market/Market.vue'
Vue.component('Candles', Candles)
Vue.component('Handsontable', Handsontable)
Vue.component('GridCanvasBase', Grid)
Vue.component('GridCanvas', GridCanvas)
Vue.component('KupiTable', KupiTable)
Vue.component('Market', Market)

