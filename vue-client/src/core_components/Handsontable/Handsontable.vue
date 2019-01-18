<template>
  <hot-table :settings="settings"></hot-table>
</template>

<script>
  import { HotTable } from '@handsontable/vue'

  export default {
    // props: ['height'],
    data: function() {
      return {
        settings: {
          data: [
            ["", "Ford", "Volvo", "Toyota", "Honda"],
            ["2016", 11, 11, 12, 13],
            ["2017", 20, 11, 14, 13],
            ["2018", 30, 15, 12, 13],
            ["2016", 11, 11, 12, 13],
            ["2017", 20, 11, 14, 13],
            ["2018", 30, 15, 12, 13],
            ["2016", 11, 11, 12, 13],
            ["2017", 20, 11, 14, 13],
            ["2018", 30, 15, 12, 13],
            ["2016", 11, 11, 12, 13],
            ["2017", 20, 11, 14, 13],
            ["2018", 30, 15, 12, 13],
            ["2016", 11, 11, 12, 13],
            ["2017", 20, 11, 14, 13],
            ["2018", 30, 15, 12, 13],
            ["2016", 11, 11, 12, 13],
            ["2017", 20, 11, 14, 13],
            ["2018", 30, 15, 12, 13],
            ["2016", 11, 11, 12, 13],
            ["2017", 20, 11, 14, 13],
            ["2018", 30, 15, 12, 13],
            ["2016", 11, 11, 12, 13],
            ["2017", 20, 11, 14, 13],
            ["2018", 30, 15, 12, 13],
            ["2016", 11, 11, 12, 13],
            ["2017", 20, 11, 14, 13],
            ["2018", 30, 15, 12, 13],
          ],
          // colHeaders: true,
          // rowHeaders: true,
          // renderAllRows: true,
          // height: 500,
          // width: 500,
          preventOverflow: 'horizontal',
          // colWidths: 80,
          // rowHeights: 23,
          // autoColumnSize: {syncLimit: 300},
          // autoRowSize: {syncLimit: 300},
          stretchH: 'all',
          autoWrapRow: true,
          width: 806,
          height: 487,
          maxRows: 22,
          // manualRowMove: true,
          // manualColumnMove: true,
          manualRowResize: true,
          manualColumnResize: true,
        }
      }
    },
    components: {
      HotTable
    },
    created() {
      setTimeout(() => {
        this.$forceUpdate()
      }, 1000)
    }
  }
</script>

<style src="../../../node_modules/handsontable/dist/handsontable.full.css"></style>
