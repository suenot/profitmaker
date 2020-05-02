<template>
  <div v-shortkey="['esc']" @shortkey="toggleAside()">
    <audio id="signal-audio" src="/sound/signal.mp3"></audio>
    <el-button class="toggleAside" type="danger" icon="el-icon-tickets" circle @click="toggleAside()"></el-button>
    <div class="aside" v-if="aside">
      <section class="section">
        <div class="aside-header">
          <h1 class="aside-header-text">Fetch</h1>
          <div>
            <i v-if="accordion.fetch" class="el-icon-arrow-up" @click="toggleAccordion('fetch')"></i>
            <i v-else class="el-icon-arrow-down" @click="toggleAccordion('fetch')"></i>
            <i class="el-icon-close" @click="toggleAside()"></i>
          </div>
        </div>
        <div class="p-16" v-if="accordion.fetch">
          <el-switch
            v-model="demo"
            active-text="Demo data"
            inactive-text="Real data"
            class="m-16">
          </el-switch>
          <el-input placeholder="Server url" v-model="server" class="m-16"></el-input>
          <el-input placeholder="History url" v-model="signalHistoryUrl" class="m-16"></el-input>
          <el-input placeholder="Details url" v-model="signalDetailsUrl" class="m-16"></el-input>
        </div>
      </section>

      <section class="section">
        <div class="aside-header">
          <h1 class="aside-header-text">Pagination</h1>
          <div>
            <i v-if="accordion.pagination" class="el-icon-arrow-up" @click="toggleAccordion('pagination')"></i>
            <i v-else class="el-icon-arrow-down" @click="toggleAccordion('pagination')"></i>
          </div>
        </div>
        <el-pagination
          layout="pager"
          :page-size="limit"
          :total="903"
          @current-change="paginationChanged($event)"
        >
        </el-pagination>
        <div class="p-16" v-if="accordion.pagination">
          <el-input placeholder="Limit" v-model="limit" class="m-16">
            <el-button slot="prepend">Limit by</el-button>
            <el-button slot="append">of {{table.length}}</el-button>
          </el-input>
        </div>
      </section>

      <section class="section">
        <div class="aside-header">
          <h1 class="aside-header-text">Sound</h1>
          <div>
            <i v-if="accordion.sound" class="el-icon-arrow-up" @click="toggleAccordion('sound')"></i>
            <i v-else class="el-icon-arrow-down" @click="toggleAccordion('sound')"></i>
          </div>
        </div>
        <div class="p-16" v-if="accordion.sound">
          <div class="sound-block">
            <el-slider v-model="sound_volume"></el-slider>
          </div>
          <el-slider v-model="sound_interval" show-input :max="60"></el-slider>
        </div>
      </section>

      <section class="section">
      <div class="aside-header">
        <h1 class="aside-header-text">Show</h1>
        <i v-if="accordion.show" class="el-icon-arrow-up" @click="toggleAccordion('show')"></i>
        <i v-else class="el-icon-arrow-down" @click="toggleAccordion('show')"></i>
      </div>
      <div class="p-16" v-if="accordion.show">
        <draggable v-model="columns" @start="drag=true" @end="drag=false">
          <div v-for="item in columns" :key="item.name">
            <el-checkbox :label="item.label" v-model="item.display"></el-checkbox>
          </div>
        </draggable>
      </div>
      </section>

      <section class="section">
        <div class="aside-header">
          <h1 class="aside-header-text">Sort</h1>
          <div>
            <i class="el-icon-plus" @click="addFilter('sorts')"></i>
            <i v-if="accordion.sort" class="el-icon-arrow-up" @click="toggleAccordion('sort')"></i>
            <i v-else class="el-icon-arrow-down" @click="toggleAccordion('sort')"></i>
          </div>
        </div>
        <div class="p-16" v-if="accordion.sort && sorts.length > 0">
          <div class="select-arrow sort" v-for="(sort, sortIndex) in sorts" :key="sort.id">
            <el-select
              v-model="sort.key"
              filterable
              default-first-option
              placeholder="Choose tags for your article"
              >
              <el-option
                v-for="item in columns"
                :key="item.value"
                :label="item.label"
                :value="item.value">
              </el-option>
            </el-select>
            <i v-if="sorts[sortIndex].direction === 'asc'" class="sort-arrow el-icon-arrow-up" @click="toggleSortDirection(sortIndex)"></i>
            <i v-if="sorts[sortIndex].direction === 'desc'" class="sort-arrow el-icon-arrow-down" @click="toggleSortDirection(sortIndex)"></i>
            <i class="el-icon-minus" @click="removeFilter('sorts', sortIndex)"></i>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="aside-header">
          <h1 class="aside-header-text">Filter profit</h1>
          <div>
            <i class="el-icon-plus" @click="addFilter('filters_profit')"></i>
            <i v-if="accordion.filter_profit" class="el-icon-arrow-up" @click="toggleAccordion('filter_profit')"></i>
            <i v-else class="el-icon-arrow-down" @click="toggleAccordion('filter_profit')"></i>
          </div>
        </div>
        <template v-if="accordion.filter_profit">
          <div class="p-16 filter-profit" v-for="(filter, filterIndex) in filters_profit" :key="filter.id">
            <el-input placeholder="" class="m-16" v-model="filter.usd">
              <el-button slot="append">$</el-button>
            </el-input>
            <el-input placeholder="" class="m-16" v-model="filter.percent">
              <el-button slot="append">%</el-button>
            </el-input>
            <el-button icon="el-icon-minus" size="mini" class="m-16 btn-rm" circle @click="removeFilter('filters_profit', filterIndex)"></el-button>
          </div>
        </template>
      </section>

      <section class="section">
        <div class="aside-header">
          <h1 class="aside-header-text">Filter profit sound</h1>
          <div>
            <i class="el-icon-plus" @click="addFilter('filters_profit_sound')"></i>
            <i v-if="accordion.filter_profit_sound" class="el-icon-arrow-up" @click="toggleAccordion('filter_profit_sound')"></i>
            <i v-else class="el-icon-arrow-down" @click="toggleAccordion('filter_profit_sound')"></i>
          </div>
        </div>
        <template v-if="accordion.filter_profit_sound">
          <div class="p-16 filter-profit-sound" v-for="(filter, filterIndex) in filters_profit_sound" :key="filter.id">
            <el-input placeholder="" class="m-16" v-model="filter.usd">
              <el-button slot="append">$</el-button>
            </el-input>
            <el-input placeholder="" class="m-16" v-model="filter.percent">
              <el-button slot="append">%</el-button>
            </el-input>
            <el-button icon="el-icon-minus" size="mini" class="m-16 btn-rm" circle @click="removeFilter('filters_profit_sound', filterIndex)"></el-button>
          </div>
        </template>
      </section>

      <section class="section">
        <div class="aside-header">
          <h1 class="aside-header-text">Filter</h1>
          <div>
            <i class="el-icon-plus" @click="addFilter('filters')"></i>
            <i v-if="accordion.filter" class="el-icon-arrow-up" @click="toggleAccordion('filter')"></i>
            <i v-else class="el-icon-arrow-down" @click="toggleAccordion('filter')"></i>
          </div>
        </div>
        <template v-if="accordion.filter">
          <div class="p-16 filter" v-for="(filter, filterIndex) in filters" :key="filter.id">
            <el-select
              class="m-16"
              v-model="filter.columns"
              multiple
              filterable
              allow-create
              default-first-option
              placeholder="Columns">
              <el-option
                v-for="item in columns"
                :key="item.value"
                :label="item.label"
                :value="item.value">
              </el-option>
            </el-select>
            <el-select
              class="m-16 action"
              v-model="filter.operator"
              placeholder="==">
              <el-option
                v-for="item in operators"
                :key="item.value"
                :label="item.label"
                :value="item.value">
              </el-option>
            </el-select>
            <el-select
              class="m-16"
              v-model="filter.values"
              multiple
              filterable
              allow-create
              default-first-option
              placeholder="Values">
              <el-option
                v-for="item in stocks"
                :key="item.value"
                :label="item.label"
                :value="item.value">
              </el-option>
            </el-select>
            <el-button icon="el-icon-minus" size="mini" class="m-16 button-center" circle @click="removeFilter('filters', filterIndex)"></el-button>
          </div>
        </template>
      </section>

    </div>
    <div class="kupi-table">
      <table v-if="tableComputed.length > 0">
        <thead v-if="tableComputed[0]">
          <tr>
            <th v-for="(th, thIndex) in tableComputed[0]" :key="thIndex">{{thIndex}}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(tr, trIndex) in tableComputed" :key="tr.id" :class="tr.status">
            <td v-for="(td, tdIndex) in tr" :key="tdIndex" @click="$router.push({ name: 'Signal', params: { id: tr.id } })" :class="table_classes[trIndex][tdIndex]">
              <template>
                {{td}}
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import uuidv1 from 'uuid/v1'
import _ from 'lodash'
import draggable from 'vuedraggable'
import Store from '@/stores/Store'
import moment from 'moment'
// var momentDurationFormatSetup = require("moment-duration-format")
// momentDurationFormatSetup(moment)
const operators = {
  '!=': function(a, b) { return a !== b },
  '==': function(a, b) { return a === b },
  '>=': function(a, b) { return parseFloat(a) >= parseFloat(b) },
  '<=': function(a, b) { return parseFloat(a) <= parseFloat(b) },
  'and': function(a, b) { return a && b },
  'or': function(a, b) { return a || b },
}
function isFalse(bool) {
  return bool === false
}
export default {
  components: {
    draggable,
  },
  data() {
    return {
      page: 1,
      demo: true,
      server: 'https://kupi.network/api/signals',
      aside: true,
      table: [],
      table_classes: [],
      interval: '',
      columns: require('./utils.js').columns,
      operators: require('./utils.js').operators,
      comparison_operators: require('./utils.js').comparisonOperators,
      stocks: require('./utils.js').stocks,
      sound_playing: false,
      sound_timer: '',
      sound_enabled: true,
      sound_volume: 20,
      sound_interval: 3,
      accordion: {
        fetch: true,
        pagination: true,
        sound: true,
        show: true,
        sort: true,
        filter_profit: true,
        filter_profit_sound: true,
        filter: true,
      },
      sorts: [],
      filters_profit: [],
      filters_profit_sound: [],
      filters: [],
      notes: [],
      limit: 20,
    }
  },
  storage: {
    keys: ['demo', 'sound_enabled', 'server', 'sound_volume', 'sound_interval', 'accordion', 'sorts', 'filters', 'filters_profit', 'filters_profit_sound', 'columns', 'aside', 'limit'],
    namespace: 'list'
  },
  fromMobx: {
    signalHistoryUrl: {
      get() {
        return Store.signalHistoryUrl
      },
      set(server) {
        Store.setSignalHistoryUrl(server)
      }
    },
    signalDetailsUrl: {
      get() {
        return Store.signalDetailsUrl
      },
      set(server) {
        Store.setSignalDetailsUrl(server)
      }
    },
  },
  mounted() {
    this.fetchList()
    this.interval = setInterval(this.fetchList, 10000)
  },
  methods: {
    paginationChanged(e) {
      this.page = e
    },
    createSoundCycle() {
      this.sound_timer = setInterval(()=>{
        this.playSound()
      }, 2000)
    },
    removeSoundCycle() {
      clearTimeout(this.sound_timer)
    },
    playSound() {
      // document.getElementById('signal-audio').volume = this.sound_volume / 100
      // document.getElementById('signal-audio').play()
    },
    addFilter(filterName) {
      if (filterName === 'filters') {
        this.filters.push({
          id: uuidv1(),
          columns: [],
          operator: '',
          values: [],
        })
      } else if (filterName === 'filters_profit' || filterName === 'filters_profit_sound') {
        this[filterName].push({
          id: uuidv1(),
          usd: 20,
          percent: 30,
        })
      } else if (filterName === 'sorts') {
        this.sorts.push({
          id: uuidv1(),
          key: '',
          direction: 'asc',
        })
      }
    },
    removeFilter(filterName, filterIndex) {
      this[filterName].splice(filterIndex, 1)
    },
    toggleSortDirection(sortIndex) {
      this.sorts[sortIndex].direction = this.sorts[sortIndex].direction === 'asc' ? 'desc' : 'asc'
    },
    toggleAside() {
      this.aside = !this.aside
    },
    toggleSound() {
      this.sound_enabled = !this.sound_enabled
    },
    toggleAccordion(block) {
      this.accordion[block] = !this.accordion[block]
    },
    fetchList() {
      if(this.demo) {
        this.table = require('./data.js').data
      } else {
        axios.get(`${this.server}`)
        .then((response) => {
          this.table = response.data
        })
        .catch((error) => {
          this.table = []
          console.log(error)
        })
      }
    },
    demoToggle() {
      this.demo = !this.demo
    },
    to_filters_profit(table) {
      // Удаление лишних строк: filters_profit
      if (this.filters_profit.length > 0) {
        table = _.filter(table, (tr)=>{
          try {
            var bools = []
            for (let filter of this.filters_profit) {
              if (tr.profitUSD >= filter.usd && tr.percent >= filter.percent) bools.push(true)
              else bools.push(false)
            }
            if ( bools.some((item) => item === true) ) return true
            else return false
          } catch(err) {}
        })
      }
      return table
    },
    to_filters_profit_sound(table) {
      // Фильтр для звукогового сигнала
      if (this.filters_profit_sound.length > 0) {
        if (this.sound_enabled) {
          _.forEach(table, (tr)=>{
            try {
              var bools = []
              for (let filter of this.filters_profit_sound) {
                if (tr.profitUSD >= filter.usd && tr.percent >= filter.percent) bools.push(true)
                else bools.push(false)
              }
              if ( bools.some((item) => item === true) ) this.sound_playing = true
              else this.sound_playing = false
            } catch(err) {}
          })
        } else if (this.sound_enabled === false) {
          this.sound_playing = false
        }
      }
      return table
    },
    to_filters(table) {
      if (this.filters.length > 0) {
        table = _.filter(table, (tr)=>{
          try {
            var bools_filters = []
            for (let filter of this.filters) {
              var bools_f = []
              for (let column of filter.columns) {
                for (let value of filter.values) {
                  if (operators[filter.operator](tr[column], value) ) {
                    bools_f.push(true)
                  } else {
                    bools_f.push(false)
                  }
                }
              }
              if (filter.operator === '==') {
                if ( bools_f.every((item) => item === false) ) bools_filters.push(false)
                else bools_filters.push(true)
              } else {
                if ( bools_f.some((item) => item === false) ) bools_filters.push(false)
                else bools_filters.push(true)
              }
            }
            if ( bools_filters.every((item) => item === true) ) return true
            else return false
          } catch(err) {}
        })
      }
      return table
    },
    to_sorts(table) {
      // Сортировка данных
      // TODO: сортировка без указания индексов
      if (this.sorts.length > 0) {
        var sorts_keys = []
        var sorts_directions = []
        for (let sort of this.sorts) {
          sorts_keys.push(sort.key)
          sorts_directions.push(sort.direction)
        }
        table = _.orderBy(table, sorts_keys, sorts_directions)
      }
      return table
    },
    to_modify(table) {
      // Преобразование данных и сбор уникальных классов
      var table_classes = []
      if (table.length > 0) {
        for (let [trKey, tr] of Object.entries(table)) {
          var td_classes = {}
          var td_displays = {}
          for (let [tdKey, td] of Object.entries(tr)) {
            // Собираем классы для cells
            if (tdKey === 'action') td_classes[tdKey] = td
            else if (tdKey === 'profitBTC') td_classes[tdKey] = 'btc'
            else if (tdKey === 'profitUSD') td_classes[tdKey] = 'usd'
            else if (tdKey === 'totalBTC') td_classes[tdKey] = 'btc'
            else if (tdKey === 'totalUSD') td_classes[tdKey] = 'usd'
            // Модифицируем данные
            if (tdKey === 'percent') table[trKey][tdKey] = td !== undefined ? td.toFixed(2) + '%' : ''
            else if (tdKey === 'profitBTC') table[trKey][tdKey] = td !== undefined ? td.toFixed(8) + ' BTC' : ''
            else if (tdKey === 'profitUSD') table[trKey][tdKey] = td !== undefined ? td.toFixed(0) + ' USD' : ''
            else if (tdKey === 'totalBTC') table[trKey][tdKey] = td !== undefined ? td.toFixed(8) + ' BTC' : ''
            else if (tdKey === 'totalUSD') table[trKey][tdKey] = td !== undefined ? td.toFixed(0) + ' USD' : ''
            else if (tdKey === 'updated') table[trKey][tdKey] = td !== undefined ? moment(td).fromNow() : ''
            else if (tdKey === 'created') table[trKey][tdKey] = td !== undefined ? moment(td).fromNow() : ''
            else if (tdKey === 'timelife') table[trKey][tdKey] = td !== undefined ? moment.duration(td, 'milliseconds').format('h:mm:ss') : ''
            else if (tdKey === 'lag') table[trKey][tdKey] = td !== undefined ? moment.duration(td, 'milliseconds').format('h:mm:ss') : ''
            else if (tdKey === 'maxProfitUSD') table[trKey][tdKey] = td !== undefined ? td.toFixed(0) + ' USD' : ''
            else if (tdKey === 'maxProfitBTC') table[trKey][tdKey] = td !== undefined ? td.toFixed(8) + ' BTC' : ''
            else if (tdKey === 'maxTotalUSD') table[trKey][tdKey] = td !== undefined ? td.toFixed(0) + ' USD' : ''
            else if (tdKey === 'maxTotalBTC') table[trKey][tdKey] = td !== undefined ?  td.toFixed(8) + ' BTC' : ''
            else if (tdKey === 'maxPercent') table[trKey][tdKey] = td !== undefined ? td.toFixed(2) + ' %' : ''
          }
          table_classes.push(td_classes)
        }
      }
      this.table_classes = table_classes
      return table
    },
    to_rm_columns(table) {
      // Удаление лишних колонок
      var _table = _.clone(table)
      var table = []
      _.forEach(_table, (tr)=>{
        var _tr = {}
        for (let column of this.columns) {
          for (let [tdKey, tdValue] of Object.entries(tr)) {
            if (column.value === tdKey && column.display === true) {
              _tr[tdKey] = tdValue
            }
          }
        }
        table.push(_tr)
      })
      return table
    }
  },
  computed: {
    tableComputed: function() {
      var table = _.cloneDeep(this.table)

      if (table.length === 0) return []

      // Удаление лишних строк: filters_profit
      table = this.to_filters_profit(table)

      // Фильтр для звукогового сигнала
      table = this.to_filters_profit_sound(table)

      // Удаление лишних строк: filters
      table = this.to_filters(table)

      // Сортировка данных
      table = this.to_sorts(table)

      // Limit
      table = table.slice((this.page-1)*parseInt(this.limit), this.page*parseInt(this.limit))

      // Преобразование данных и сбор уникальных классов
      table = this.to_modify(table)

      // Удаление лишних колонок
      table = this.to_rm_columns(table)

      return table
    },
    columnsComputed: function() {
      return _.keyBy(this.columns, 'value')
    }
  },
  beforeDestroy() {
    clearInterval(this.interval)
    this.removeSoundCycle()
  },
  filters: {
    fromNow: function (date) {
      return moment(date).fromNow()
    },
    toFixed: function (number, n) {
      return number.toFixed(n)
    }
  },
  watch: {
    demo: function () {
      this.fetchList()
    },
    sound_playing: function (value) {
      if (value === true) this.createSoundCycle()
      else this.removeSoundCycle()
    },
    sound_interval: function () {
      this.removeSoundCycle()
      this.createSoundCycle()
    },
    sound_enabled: function () {
      this.removeSoundCycle()
    }
  },
}
</script>

<style lang="sass" src="./List.sass" scoped></style>
