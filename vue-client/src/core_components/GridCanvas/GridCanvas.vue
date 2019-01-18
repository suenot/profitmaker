<template>
    <div>
        <GridCanvasBase :grid-data="data" :columns="columns" :showCheckbox="showCheckbox" :columnSet="columnSet" :left-height="20" @focus="focus" @updateValue="update" :showRate="true"></GridCanvasBase>
    </div>
</template>

<script>
export default {
    data() {
        return {
            columnSet: true,
            showCheckbox: false,
            data: [],
            columns: [
                { title: '品牌', key: 'brandName', width: 80 },
                { title: '商品名称', key: 'goodsName', width: 150 },
                { title: '规格型号', key: 'sn', width: 100 },
                // { title: '物料编码', key: 'materialNo', width: 100 },
                // { title: '单位', key: 'unit', width: 70 },
                // { title: '数量', key: 'requiredQuantity', type: 'number', width: 70 },
                // { title: '客户备注', key: 'customerRemarks', width: 150 },
                // { title: '采购价(元)', key: 'purchasePrice', type: 'number', width: 80 },
                // { title: '销售价(元)', key: 'salePrice', type: 'number', width: 80 },
                // { title: '货期', width: 100, key: 'shipDesc' },
                // {
                //     title: '操作',
                //     width: 70,
                //     fixed: true,
                //     renderButton(rowData, index) {
                //         return [{
                //             title: '操作',
                //             click() {
                //                 console.log(rowData, index)  //eslint-disable-line
                //             },
                //         }]
                //     },
                // },
            ],
        }
    },
    created() {
        for (let i = 0; i < 100; i += 1) {
            this.data.push({
                brandName: `博世${i}`,
                goodsName: `电钻${i}`,
                sn: `SDFSD${i}`,
                materialNo: `1231${i}`,
                unit: '个',
                requiredQuantity: 10,
                customerRemarks: `测试测试${i}`,
                purchasePrice: 10.2,
                salePrice: 12.3,
                shipDesc: 10,
            })
        }
    },
    methods: {
        update(value) {
            console.log(value) //eslint-disable-line
        },
        focus(value) {
            console.log(value) //eslint-disable-line
        },
    },
}
</script>
