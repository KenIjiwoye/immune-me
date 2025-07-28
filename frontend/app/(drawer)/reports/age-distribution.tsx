import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function AgeDistributionScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Age Distribution' }} />
      <View style={styles.container}>
        <Text style={styles.text}>Age Distribution Report</Text>
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