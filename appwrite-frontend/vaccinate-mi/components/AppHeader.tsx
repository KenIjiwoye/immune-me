import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Layout, Text, TopNavigation } from '@ui-kitten/components';
import { Ionicons } from '@expo/vector-icons';

interface AppHeaderProps {
  userName: string;
  userRole: string;
  userAvatar?: string;
  greeting?: string;
  hasNotifications?: boolean;
  onNotificationPress?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  userName,
  userRole,
  userAvatar,
  greeting = 'Good morning',
  hasNotifications = false,
  onNotificationPress,
}) => {
  const renderNotificationButton = () => (
    <TouchableOpacity
      onPress={onNotificationPress}
      style={styles.notificationButton}
    >
      <View style={styles.notificationContainer}>
        <Ionicons name="notifications-outline" size={24} color="#8F9BB3" />
        {hasNotifications && <View style={styles.notificationBadge} />}
      </View>
    </TouchableOpacity>
  );

  const renderTitle = () => (
    <View style={styles.titleContainer}>
      {userAvatar ? (
        <Image source={{ uri: userAvatar }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder} />
      )}
      <View style={styles.userInfo}>
        <Text category="c1" appearance="hint">
          {userRole}
        </Text>
        <Text category="s1" style={styles.userName}>
          {userName}
        </Text>
      </View>
    </View>
  );

  return (
    <Layout level="1" style={styles.container}>
      <TopNavigation
        title={renderTitle}
        accessoryRight={renderNotificationButton}
        style={styles.topNavigation}
      />
      <Text category="h4" style={styles.greeting}>
        {greeting}
      </Text>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  topNavigation: {
    backgroundColor: 'transparent',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e4e9f2',
  },
  userInfo: {
    flexDirection: 'column',
  },
  userName: {
    fontWeight: 'bold',
  },
  notificationButton: {
    padding: 8,
  },
  notificationContainer: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF3D71',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  greeting: {
    paddingHorizontal: 16,
    paddingTop: 8,
    fontWeight: 'bold',
  },
});
