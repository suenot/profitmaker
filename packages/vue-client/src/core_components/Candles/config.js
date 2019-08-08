export default [
  {
    name: "Candles",
    component: "Candles",
    settings: "",
    settingsWidth: 300,
    img: "core_components/Candles/Candles.png",
    title: "Candles",
    customTitle: "",
    description: "Open-High-Low-Close-Value candles chart",
    author: "#core",
    authorLink: "https://github.com/kupi-network/kupi-terminal",
    source: "",
    demo: false,
    timeframe: "1m",
    library: "react-stockcharts",
    libraries: ["react-stockcharts", "v-charts"],
    stock: undefined,
    pair: undefined,
    channel: "default",
    channels: ["default", "kupi", "ccxt"],
    categories: ["Trades", "Candles"],
  }
]
