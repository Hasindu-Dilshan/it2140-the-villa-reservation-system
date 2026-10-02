import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export const StatusBadge = ({ status }) => {
  let bgColor = colors.statusPendingBg;
  let textColor = colors.statusPending;

  switch (status) {
    case 'Confirmed':
      bgColor = colors.statusConfirmedBg;
      textColor = colors.statusConfirmed;
      break;
    case 'Cancelled':
      bgColor = colors.statusCancelledBg;
      textColor = colors.statusCancelled;
      break;
    case 'Pending':
    default:
      bgColor = colors.statusPendingBg;
      textColor = colors.statusPending;
      break;
  }

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <View style={[styles.dot, { backgroundColor: textColor }]} />
      <Text style={[styles.text, { color: textColor }]}>{status}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
