import { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import { colors, radius, spacing, typography } from '../../theme';
import { useLanguage } from '../../contexts/LanguageContext';
import { BottomSheet } from './BottomSheet';

type Props = {
  value: Date | null;
  onChange: (date: Date) => void;
  placeholder?: string;
  minimumDate?: Date;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

function formatLabel(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}` +
    ` ${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

function combine(datePart: Date, timePart: Date): Date {
  return new Date(
    datePart.getFullYear(),
    datePart.getMonth(),
    datePart.getDate(),
    timePart.getHours(),
    timePart.getMinutes(),
  );
}

function adjustForMinuteWrap(previous: Date, picked: Date): Date {
  const next = new Date(picked);
  const sameDateAndHour =
    previous.getFullYear() === picked.getFullYear() &&
    previous.getMonth() === picked.getMonth() &&
    previous.getDate() === picked.getDate() &&
    previous.getHours() === picked.getHours();

  if (!sameDateAndHour) return next;

  const previousMinute = previous.getMinutes();
  const pickedMinute = picked.getMinutes();
  if (previousMinute >= 45 && pickedMinute <= 15) {
    next.setHours(next.getHours() + 1);
  } else if (previousMinute <= 15 && pickedMinute >= 45) {
    next.setHours(next.getHours() - 1);
  }

  return next;
}

/**
 * 기기 네이티브 날짜/시간 선택기.
 * - iOS: 모달 스피너(datetime) + 취소/완료
 * - Android: 네이티브 날짜 다이얼로그 → 시간 다이얼로그 순차 호출
 * value/onChange 는 기기 로컬 벽시계 기준 Date 를 사용한다.
 */
export function DateTimeField({ value, onChange, placeholder, minimumDate, style, disabled = false }: Props) {
  const { language, l } = useLanguage();
  const [iosVisible, setIosVisible] = useState(false);
  const [iosTemp, setIosTemp] = useState<Date | null>(null);

  const base = value ?? minimumDate ?? new Date();
  const iosSelection = iosTemp ?? base;
  const iosSelectionBeforeMinimum = Boolean(
    minimumDate && iosSelection.getTime() < minimumDate.getTime(),
  );

  const openAndroid = () => {
    DateTimePickerAndroid.open({
      value: base,
      mode: 'date',
      minimumDate,
      onChange: (event: DateTimePickerEvent, picked?: Date) => {
        if (event.type !== 'set' || !picked) return;
        DateTimePickerAndroid.open({
          value: picked,
          mode: 'time',
          is24Hour: true,
          onChange: (timeEvent: DateTimePickerEvent, pickedTime?: Date) => {
            if (timeEvent.type !== 'set' || !pickedTime) return;
            onChange(combine(picked, pickedTime));
          },
        });
      },
    });
  };

  const open = () => {
    if (disabled) return;
    if (Platform.OS === 'android') {
      openAndroid();
      return;
    }
    setIosTemp(base);
    setIosVisible(true);
  };

  const confirmIos = () => {
    if (iosSelectionBeforeMinimum) return;
    onChange(iosTemp ?? base);
    setIosVisible(false);
  };

  return (
    <>
      <Pressable
        style={({ pressed }) => [
          styles.field,
          disabled && styles.disabled,
          pressed && !disabled && styles.pressed,
          style,
        ]}
        onPress={open}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
      >
        <Text style={value ? styles.valueText : styles.placeholderText} numberOfLines={1}>
          {value ? formatLabel(value) : (placeholder ?? l('날짜 선택'))}
        </Text>
      </Pressable>

      {Platform.OS === 'ios' ? (
        <BottomSheet
          visible={iosVisible}
          onClose={() => setIosVisible(false)}
          sheetStyle={styles.sheet}
        >
          <View style={styles.sheetHeader}>
            <Pressable onPress={() => setIosVisible(false)} hitSlop={8}>
              <Text style={styles.headerCancel}>{l('취소')}</Text>
            </Pressable>
            <Pressable
              onPress={confirmIos}
              hitSlop={8}
              disabled={iosSelectionBeforeMinimum}
              accessibilityState={{ disabled: iosSelectionBeforeMinimum }}
            >
              <Text
                style={[
                  styles.headerDone,
                  iosSelectionBeforeMinimum && styles.headerDoneDisabled,
                ]}
              >
                {l('완료')}
              </Text>
            </Pressable>
          </View>
          <DateTimePicker
            value={iosSelection}
            mode="datetime"
            display="spinner"
            locale={language === 'en' ? 'en-US' : 'ko-KR'}
            themeVariant="light"
            textColor={colors.gray6}
            onChange={(_event: DateTimePickerEvent, picked?: Date) => {
              if (picked) setIosTemp(adjustForMinuteWrap(iosSelection, picked));
            }}
            style={styles.picker}
          />
          {iosSelectionBeforeMinimum ? (
            <Text style={styles.minimumDateHint}>
              {l('선택 가능한 시간 이후로 설정해주세요.')}
            </Text>
          ) : null}
        </BottomSheet>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.6,
  },
  valueText: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  placeholderText: {
    ...typography.body1_3,
    color: colors.gray3,
  },
  sheet: {
    paddingHorizontal: 0,
    paddingTop: 0,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray1,
  },
  headerCancel: {
    ...typography.subhead5,
    color: colors.gray5,
  },
  headerDone: {
    ...typography.subhead5,
    color: colors.primary1,
  },
  headerDoneDisabled: {
    color: colors.gray3,
  },
  minimumDateHint: {
    ...typography.caption1_3,
    color: colors.likeRed,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  picker: {
    height: 216,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: colors.white,
  },
});
