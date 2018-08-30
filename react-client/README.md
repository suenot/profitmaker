### TODO:
1. Rerender without triggering window resize
```js
onLayoutChange={(layout, layouts) => {
    this.onLayoutChange(layout, layouts)
    window.dispatchEvent(new Event('resize'))
  }
}
```