import React from 'react';
import { View, Text, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type StatCardProps = {
  title: string;
  value: number;
  icon: string;
  color: string;
  onPress?: () => void;
};

export default function StatCard({ title, value, icon, color, onPress }: StatCardProps) {
  const cardContent = (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableWithoutFeedback onPress={onPress}>
        {cardContent}
      </TouchableWithoutFeedback>
    );
  }

  return cardContent;
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  value: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 12,
    color: '#6c757d',
  },
});