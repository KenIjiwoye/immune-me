import { ScrollView, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Layout, Text, Card, Icon } from '@ui-kitten/components';
import { AppHeader } from '@/components/AppHeader';

export default function Index() {
  const handleNotificationPress = () => {
    console.log('Notifications pressed');
  };

  const handleQuickAction = (action: string) => {
    console.log(`Quick action: ${action}`);
  };

  const handleForYouPress = (item: string) => {
    console.log(`For you item: ${item}`);
  };

  const renderStatsCard = (title: string, value: string, subtitle: string, status: 'default' | 'warning' = 'default') => (
    <Card style={[styles.statCard, status === 'warning' && styles.warningCard]}>
      <Text category="c1" appearance="hint">
        {title}
      </Text>
      <Text category="h3" style={styles.statValue}>
        {value}
      </Text>
      <Text category="c1" status={status === 'warning' ? 'warning' : 'success'} style={styles.statSubtitle}>
        {subtitle}
      </Text>
    </Card>
  );

  const renderQuickAction = (iconName: string, label: string, action: string) => (
    <TouchableOpacity
      style={styles.quickActionCard}
      onPress={() => handleQuickAction(action)}
      key={action}
    >
      <View style={styles.quickActionIconContainer}>
        <Icon name={iconName} style={styles.quickActionIcon} fill="#3366FF" />
      </View>
      <Text category="s2" style={styles.quickActionLabel}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderForYouItem = (iconName: string, title: string, description: string, action: string) => (
    <TouchableOpacity
      style={styles.listItem}
      onPress={() => handleForYouPress(action)}
      key={action}
    >
      <View style={styles.listItemIcon}>
        <Icon name={iconName} style={styles.icon} fill="#3366FF" />
      </View>
      <View style={styles.listItemContent}>
        <Text category="s1">{title}</Text>
        <Text category="c1" appearance="hint">
          {description}
        </Text>
      </View>
      <Icon name="chevron-right-outline" style={styles.chevronIcon} fill="#8F9BB3" />
    </TouchableOpacity>
  );

  const renderActivityItem = (iconName: string, iconColor: string, iconBg: string, message: string, time: string) => (
    <View style={styles.activityItem} key={time}>
      <View style={[styles.activityIcon, { backgroundColor: iconBg }]}>
        <Icon name={iconName} style={styles.activityIconImage} fill={iconColor} />
      </View>
      <View style={styles.activityContent}>
        <Text category="s2">{message}</Text>
        <Text category="c1" appearance="hint">
          {time}
        </Text>
      </View>
    </View>
  );

  return (
    <Layout style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <AppHeader
          userName="Dr. Emily Carter"
          userRole="Physician"
          userAvatar="https://lh3.googleusercontent.com/aida-public/AB6AXuCIWp8RkHC1oIYBZNLmlvs8ly_pcWipAn2qRMSApHoGREME2mBdGOp7RUGZc8ZRqh_rtIbjDCVLqpoxG9mXjRNcYSH2_X_sxLbAppp_Oqh9obiSKbERQL8x_xlUR3vSnEoAk0-CQYMq1tAg5jVhIrOe5w7LfDh5oFCbLYS6G7YfZEOp1Z1cTXcVd_SEWD1Vd59Gcp4ZL5oKeKwi0y7qp-454ixjx42S8jACz4K8Tv8d3oZqr5EcYRqNjRgJazYfp79tMFU6dLznqu4"
          greeting="Good morning"
          hasNotifications={true}
          onNotificationPress={handleNotificationPress}
        />

        {/* Stats */}
        <View style={styles.statsContainer}>
          {renderStatsCard('Pending Immunizations', '24', 'Due this week')}
          {renderStatsCard('Overdue Notifications', '5', 'High Priority', 'warning')}
        </View>

        {/* Quick Actions */}
        <Layout style={styles.section} level="1">
          <Text category="h6" style={styles.sectionTitle}>
            Quick Actions
          </Text>
          <View style={styles.quickActionsGrid}>
            {renderQuickAction('search-outline', 'Search Patient', 'search')}
            {renderQuickAction('camera-outline', 'Scan Vaccine', 'scan')}
            {renderQuickAction('file-add-outline', 'Add Record', 'add')}
          </View>
        </Layout>

        {/* For You Section */}
        <Layout style={styles.section} level="1">
          <Text category="h6" style={styles.sectionTitle}>
            For You
          </Text>
          <Layout style={styles.listContainer} level="2">
            {renderForYouItem('people-outline', 'View My Patients', 'See patients assigned to you', 'patients')}
            {renderForYouItem('calendar-outline', 'Daily Schedule', "Check today's appointments", 'schedule')}
          </Layout>
        </Layout>

        {/* Recent Activity */}
        <Layout style={styles.section} level="1">
          <Text category="h6" style={styles.sectionTitle}>
            Recent Activity
          </Text>
          <Layout style={styles.activityContainer} level="1">
            {renderActivityItem(
              'checkmark-circle-outline',
              '#00E096',
              'rgba(0, 224, 150, 0.2)',
              'Record updated for John S.',
              '10 min ago'
            )}
            {renderActivityItem(
              'shield-outline',
              '#0095FF',
              'rgba(0, 149, 255, 0.2)',
              'New vaccine batch added',
              '45 min ago'
            )}
            {renderActivityItem(
              'alert-circle-outline',
              '#FFAA00',
              'rgba(255, 170, 0, 0.2)',
              'Incomplete record for Anna L.',
              '2 hours ago'
            )}
          </Layout>
        </Layout>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  statCard: {
    flex: 1,
    minWidth: 158,
  },
  warningCard: {
    backgroundColor: 'rgba(255, 170, 0, 0.1)',
    borderColor: 'rgba(255, 170, 0, 0.3)',
  },
  statValue: {
    fontWeight: 'bold',
    marginVertical: 4,
  },
  statSubtitle: {
    fontWeight: '500',
  },
  section: {
    paddingTop: 16,
  },
  sectionTitle: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    fontWeight: 'bold',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
  },
  quickActionCard: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: '#F7F9FC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EDF1F7',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
  },
  quickActionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(51, 102, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionIcon: {
    width: 28,
    height: 28,
  },
  quickActionLabel: {
    textAlign: 'center',
    fontWeight: 'bold',
  },
  listContainer: {
    borderRadius: 8,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1F7',
  },
  listItemIcon: {
    width: 24,
    height: 24,
  },
  listItemContent: {
    flex: 1,
    gap: 4,
  },
  icon: {
    width: 24,
    height: 24,
  },
  chevronIcon: {
    width: 20,
    height: 20,
  },
  activityContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityIconImage: {
    width: 24,
    height: 24,
  },
  activityContent: {
    flex: 1,
    gap: 4,
  },
  bottomSpacer: {
    height: 96,
  },
});
