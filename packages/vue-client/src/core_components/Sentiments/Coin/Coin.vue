<template>
  <div>
    <div class="title">
      <span class="title-header">Sentiments: {{$route.params.id}}</span>
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
        <tr v-for="comment in dataComputed" :key="comment._id">
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
          <td>
            <span :class="comment.sentiment">
              {{comment.polarity | toFixed(2)}}
            </span>
          </td>
          <td>{{comment.subjectivity | toFixed(2)}}</td>
        </tr>
      </table>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import _ from 'lodash'

export default {
  data: () => ({
    data: require('./data.js').default,
    url: 'https://kupi.network/api/sentiments/btc'
  }),
  mounted: function() {
    axios.get(this.url)
      .then((response) => {
        this.data = response.data
      })
      .catch((err) => {
        console.log(err)
      })
  },
  computed: {
    dataComputed() {
      var data = _.cloneDeep(this.data)
      return data.map((comment)=>{
        if (comment.polarity > 0.1) {
          comment.sentiment = 'positive'
        } else if (comment.polarity < -0.1) {
          comment.sentiment = 'negative'
        } else {
          comment.sentiment = 'neutral'
        }
        return comment
      })
    }
  }
}
</script>

<style lang="sass" scoped>
a
  color: black !important
  text-decoration: none
.positive
  color: rgb(112, 168, 0)
.negative
  color: rgb(234, 0, 112)  
.user
  display: flex
  align-items: center
  img
    border-radius: 100%
    margin-right: 10px
</style>

