import React from 'react';
import { Drawer } from 'expo-router/drawer';
import { Ionicons } from '@expo/vector-icons';

export default function DrawerLayout() {
  return (
    <Drawer
      screenOptions={{
        headerStyle: {
          backgroundColor: '#007bff',
        },
        headerTintColor: '#fff',
        drawerActiveBackgroundColor: '#007bff',
        drawerActiveTintColor: '#fff',
        drawerInactiveTintColor: '#333',
        drawerLabelStyle: {
          fontSize: 15,
        },
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          drawerLabel: 'Dashboard',
          title: 'Dashboard',
          drawerIcon: ({ color }) => (
            <Ionicons name="home-outline" size={22} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="patients"
        options={{
          drawerLabel: 'Patients',
          title: 'Patients',
          drawerIcon: ({ color }) => (
            <Ionicons name="people-outline" size={22} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="immunizations/add"
        options={{
          drawerLabel: 'New Immunization',
          title: 'Add Immunization',
          drawerIcon: ({ color }) => (
            <Ionicons name="add-circle-outline" size={22} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="reports"
        options={{
          drawerLabel: 'Reports',
          title: 'Reports',
          drawerIcon: ({ color }) => (
            <Ionicons name="bar-chart-outline" size={22} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="notifications"
        options={{
          drawerLabel: 'Notifications',
          title: 'Notifications',
          drawerIcon: ({ color }) => (
            <Ionicons name="notifications-outline" size={22} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          drawerLabel: 'Settings',
          title: 'Settings',
          drawerIcon: ({ color }) => (
            <Ionicons name="settings-outline" size={22} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="profile"
        options={{
          drawerLabel: 'Profile',
          title: 'Profile',
          drawerIcon: ({ color }) => (
            <Ionicons name="person-outline" size={22} color={color} />
          ),
        }}
      />
    </Drawer>
  );
}
