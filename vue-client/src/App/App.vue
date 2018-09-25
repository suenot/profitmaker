<template>
  <v-app id="inspire">
    <v-navigation-drawer
      :clipped="$vuetify.breakpoint.lgAndUp"
      v-model="drawer"
      fixed
      app
    >
      <v-list dense>
        
        <v-list-tile @click="addDashboard()">
          <v-list-tile-action>
            <v-icon>add</v-icon>
          </v-list-tile-action>
          <v-list-tile-content color="deep-orange accent-3">
            <v-list-tile-title>
              Create dashboard
            </v-list-tile-title>
          </v-list-tile-content>
        </v-list-tile>

        <v-list-tile
          v-for="(dashboard, i) in dashboards"
          :key="i"
          @click="openDashboard(dashboard.id)"
        >
          <v-list-tile-action v-if="dashboard.icon">
            <v-icon>{{ dashboard.icon }}</v-icon>
          </v-list-tile-action>
          <v-list-tile-content>
            <v-list-tile-title exact-active-class="active">
              {{ dashboard.text }}
            </v-list-tile-title>
          </v-list-tile-content>
        </v-list-tile>

      </v-list>
    </v-navigation-drawer>

    <v-navigation-drawer
      :clipped="$vuetify.breakpoint.lgAndUp"
      v-model="drawerRight"
      fixed
      app
      right
    >
      <v-list dense>
        
        <v-list-tile>
          <v-list-tile-action>
            <v-icon>add</v-icon>
          </v-list-tile-action>
          <v-list-tile-content>
            <v-list-tile-title>
              Create dashboard
            </v-list-tile-title>
          </v-list-tile-content>
        </v-list-tile>

      </v-list>
    </v-navigation-drawer>

    <v-toolbar
      :clipped-left="$vuetify.breakpoint.lgAndUp"
      color="indigo"
      dark
      app
      fixed
    >
      <v-toolbar-title style="width: 300px" class="ml-0 pl-3">
        <v-toolbar-side-icon @click.stop="drawer = !drawer"></v-toolbar-side-icon>
        <span class="hidden-sm-and-down">Kupi terminal</span>
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn icon @click="editDashboard('1')">
        <v-icon>settings</v-icon>
      </v-btn>
      <v-btn icon @click="removeDashboard('1')">
        <v-icon>close</v-icon>
      </v-btn>
    </v-toolbar>
    <v-content>
      <v-container fluid fill-height>
        <v-layout>
          <router-view :key="$route.path" />
        </v-layout>
      </v-container>
    </v-content>
    <v-btn
      fab
      bottom
      right
      color="pink"
      dark
      fixed
      @click="dialog = !dialog"
    >
      <v-icon>add</v-icon>
    </v-btn>
  </v-app>
</template>

<script src="./App.js"></script>
<style src="./App.sass" lang="sass"></style>