<template>
  <div class="profile" v-if="JSON.stringify(user) !== '{}'">
    <h1>{{user.name}} <span class="muted">{{user.email}}</span></h1>
  </div>
</template>


<script>
import AccountsStore from '../../stores/AccountsStore'
export default {
  fromMobx: {
    user() {
      return AccountsStore.user
    },
  },
}
</script>

<style lang="sass">

</style>
