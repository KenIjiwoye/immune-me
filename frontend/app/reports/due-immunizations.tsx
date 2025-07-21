import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function DueImmunizationsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Due Immunizations' }} />
      <View style={styles.container}>
        <Text style={styles.text}>Due Immunizations Report</Text>
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