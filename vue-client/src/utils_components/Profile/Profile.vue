<template>
  <div class="profile">
    <h2>{{user.name}} <span class="muted">{{user.email}}</span></h2>
  </div>
</template>

<script>
import AccountsStore from '../../stores/AccountsStore'
export default {
  props: ['server'],
  fromMobx: {
    user() {
      if (this.server === 'terminal') return AccountsStore.user
      else return AccountsStore.kupiUser
    }
  },
}
</script>

<style lang="sass">
.profile
  text-align: center
  padding: 16px
</style>
