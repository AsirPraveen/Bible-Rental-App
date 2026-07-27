// ════════════════════════════════════════════════
//  MessageNoteCard.tsx  —  Compact Card (v2)
// ════════════════════════════════════════════════
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MessageNote } from '../types/MessageNote';
import { useAuth } from '../../../context/AuthContext';
import { useTheme, ColorsType } from '../../../context/ThemeContext';

export const CATEGORY_META: Record<
    string,
    { color: string; icon: keyof typeof Ionicons.glyphMap; bg: string }
> = {
    'Sunday Service': { color: '#146C94', bg: '#F6F1F1', icon: 'sunny-outline' },
    'Bible Study': { color: '#146C94', bg: '#F6F1F1', icon: 'book-outline' },
    'Prayer Cell': { color: '#146C94', bg: '#F6F1F1', icon: 'hand-left-outline' },
    'Special Meeting': { color: '#146C94', bg: '#F6F1F1', icon: 'star-outline' },
    'Youth Meeting': { color: '#146C94', bg: '#F6F1F1', icon: 'people-outline' },
    'Other': { color: '#146C94', bg: '#F6F1F1', icon: 'document-outline' },
};

interface Props {
    note: MessageNote;
    onPress: () => void;
    onLongPress?: () => void;
    isCommunity?: boolean;
}

export default function MessageNoteCard({ note, onPress, onLongPress, isCommunity }: Props) {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const meta = CATEGORY_META[note.category] ?? CATEGORY_META['Other'];
    const { user } = useAuth();

    const isOwner = user && (
        note.authorEmail === user.email ||
        (note as any).user === user._id ||
        (note as any).user?._id === user._id
    );

    const metaColor = colors.theme === 'dark' ? colors.tint : (meta.color || colors.primary);
    const metaBg = colors.theme === 'dark' ? colors.inputBg : (meta.bg || '#F6F1F1');

    return (
        <TouchableOpacity
            style={[styles.card, isCommunity && styles.cardCommunity]}
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.8}
        >
            <View style={[styles.accent, { backgroundColor: metaColor }]} />
            <View style={styles.body}>
                {/* Top row: badge + date */}
                <View style={styles.topRow}>
                    <View style={styles.badgeRow}>
                        <View style={[styles.badge, { backgroundColor: metaBg }]}>
                            <Ionicons name={meta.icon} size={11} color={metaColor} />
                            <Text style={[styles.badgeText, { color: metaColor }]}>{note.category}</Text>
                        </View>
                        {note.isPublic && !isCommunity && (
                            <View style={[styles.badge, { backgroundColor: colors.theme === 'dark' ? 'rgba(74, 222, 128, 0.15)' : '#E8F5E9' }]}>
                                <Ionicons name="earth" size={11} color={colors.theme === 'dark' ? '#4ADE80' : '#2E7D32'} />
                                <Text style={[styles.badgeText, { color: colors.theme === 'dark' ? '#4ADE80' : '#2E7D32' }]}>Public</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.dateText}>
                        {new Date(note.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </Text>
                </View>

                {/* Title */}
                <Text style={styles.title} numberOfLines={1}>{note.title}</Text>

                {/* Verse reference if present */}
                {note.verse ? (
                    <View style={styles.verseRow}>
                        <Ionicons name="book" size={12} color={metaColor} />
                        <Text style={[styles.verse, { color: metaColor }]}>{note.verse}</Text>
                    </View>
                ) : null}

                {/* Content preview */}
                <Text style={styles.preview} numberOfLines={2}>
                    {note.content.replace(/\*\*/g, '').replace(/_/g, '').replace(/==/g, '')}
                </Text>

                {/* Footer: icons for extras + author if community */}
                <View style={styles.footer}>
                    <View style={styles.footerIcons}>
                        {note.highlights?.length > 0 && (
                            <View style={styles.pill}>
                                <Ionicons name="brush" size={10} color={metaColor} />
                                <Text style={[styles.pillText, { color: metaColor }]}>{note.highlights.length}</Text>
                            </View>
                        )}
                        {note.voiceNotes?.length > 0 && (
                            <View style={styles.pill}>
                                <Ionicons name="mic" size={10} color={metaColor} />
                                <Text style={[styles.pillText, { color: metaColor }]}>{note.voiceNotes.length}</Text>
                            </View>
                        )}
                        {isOwner && note.reminders?.length > 0 && (
                            <View style={styles.pill}>
                                <Ionicons name="notifications" size={10} color={metaColor} />
                            </View>
                        )}
                    </View>
                    
                    {isCommunity && note.authorEmail ? (
                        <View style={styles.authorRow}>
                            <Ionicons name="person-circle" size={14} color={colors.textSecondary} />
                            <Text style={styles.authorText}>{note.authorEmail.split('@')[0]}</Text>
                        </View>
                    ) : (
                        <Ionicons name="chevron-forward" size={14} color={colors.border} />
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}

const getStyles = (colors: ColorsType) => StyleSheet.create({
    card: {
        flexDirection: 'row',
        backgroundColor: colors.cardBg,
        borderRadius: 18,
        marginVertical: 8,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: colors.theme === 'dark' ? 0.3 : 0.1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 12,
    },
    cardCommunity: {
        borderColor: colors.theme === 'dark' ? '#38BDF860' : '#19A7CE40',
        backgroundColor: colors.theme === 'dark' ? '#1E293B' : '#F0F9FF',
    },
    accent: { width: 5 },
    body: { flex: 1, padding: 15 },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    badgeRow: { flexDirection: 'row', gap: 6 },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 20,
    },
    badgeText: { fontSize: 11, fontWeight: '800' },
    dateText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
    title: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 4 },
    verseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginBottom: 8,
    },
    verse: { fontSize: 14, fontWeight: '800', fontStyle: 'italic' },
    preview: { fontSize: 14, color: colors.textSecondary, lineHeight: 22, marginBottom: 12 },

    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: colors.divider,
        paddingTop: 10,
    },
    footerIcons: { flexDirection: 'row', gap: 8 },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.inputBg,
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: colors.border,
    },
    pillText: { fontSize: 11, fontWeight: '800' },
    authorRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    authorText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
});