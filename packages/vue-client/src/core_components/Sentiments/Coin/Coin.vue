<template>
  <div>
    <div class="title">
      <span class="title-header">{{$route.params.id}}</span>
    </div>
    <div class="kupi-table">
      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Message</th>
            <th>Followers</th>
            <th>Sentiment</th>
            <th>Subjectivity</th>
          </tr>
        </thead>
        <tr v-for="comment in data" :key="comment.uuid">
          <td>
            <a class="user" :href="`https://twitter.com/${comment.user.screen_name}`">
              <img :src="comment.user.profile_image_url" :alt="comment.user.name" />
              <span>{{comment.user.name}}</span>
            </a>
          </td>
          <td>
            <a :href="`https://twitter.com/${comment.user.screen_name}/status/${comment.id}`">
              {{comment.text}}
            </a>
          </td>
          <td>{{comment.user.followers_count}}</td>
          <td>{{comment.polarity | toFixed(2)}}</td>
          <td>{{comment.subjectivity | toFixed(2)}}</td>
        </tr>
      </table>
    </div>
  </div>
</template>

<script>
export default {
  data: () => ({
    data: require('./data.js').default,
  })
}
</script>

<style lang="sass" scoped>
.user
  display: flex
  align-items: center
  img
    border-radius: 100%
    margin-right: 10px
</style>

