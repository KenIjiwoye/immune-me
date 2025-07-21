import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function FacilityPerformanceScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Facility Performance' }} />
      <View style={styles.container}>
        <Text style={styles.text}>Facility Performance Report</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  text: {
    fontSize: 18,
    color: '#333',
  },
});