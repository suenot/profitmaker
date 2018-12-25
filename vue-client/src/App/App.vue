<template>
  <div>
    <div class="aside">
      <ul>
        <li @click="addDashboard()"><v-icon>home</v-icon></li>
        <li
          v-for="(dashboard, i) in dashboards"
          :key="i"
          @click="openDashboard(dashboard.id)"
        >
          <img :src="dashboard.icon" alt="">
        </li>
      </ul>
    </div>
    <div class="main">
       <router-view :key="$route.path" />
    </div>
  </div>
</template>

<script src="./App.js"></script>
<style src="./App.sass" lang="sass"></style>
