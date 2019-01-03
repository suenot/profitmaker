<template>
  <div>
    <div class="aside">
      <ul>
        <li @click="state.addDashboard()"><v-icon>add_to_queue</v-icon></li>
        <li
          v-for="dashboard in state.dashboards"
          :key="dashboard.id"
          @click.left="openDashboard(dashboard.id)"
          @click.right="state.removeDashboard(dashboard.id)"
          :class="dashboard.id === dashboardActiveId ? 'active' : ''"
        >
          <img :src="dashboard.icon" alt="">
        </li>
        <li @click="addWidget()"><v-icon>add</v-icon></li>
      </ul>
    </div>
    <div class="main">
       <router-view :key="$route.path" />
    </div>
  </div>
</template>

<script src="./App.js"></script>
<style src="./App.sass" lang="sass"></style>
