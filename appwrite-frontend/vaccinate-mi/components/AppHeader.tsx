import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Layout, Text, TopNavigation, Icon, TopNavigationAction } from '@ui-kitten/components';

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
  const NotificationIcon = (props: any) => (
    <View style={styles.notificationContainer}>
      <Icon name="bell-outline" fill={props?.fill || '#8F9BB3'} style={{ width: 24, height: 24 }} />
      {hasNotifications && <View style={styles.notificationBadge} />}
    </View>
  );

  const renderNotificationAction = () => (
    <TopNavigationAction icon={NotificationIcon} onPress={onNotificationPress} />
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
        accessoryRight={renderNotificationAction}
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
