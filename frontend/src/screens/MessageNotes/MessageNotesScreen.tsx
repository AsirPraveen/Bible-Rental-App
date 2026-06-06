// ════════════════════════════════════════════════
//  MessageNotesScreen.tsx — Premium UI (FastingTracker style)
//  - Gradient header with reminder bell (top-right)
//  - Community / My Notes tabs
//  - Category chips
//  - Card list with highlight colors
// ════════════════════════════════════════════════
import React, { useCallback, useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList,
    ActivityIndicator, TouchableOpacity, TextInput,
    Alert, SafeAreaView, StatusBar, Platform, Dimensions, Modal, ScrollView
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
    getAllNotes, deleteNote,
    getStandaloneReminders, addStandaloneReminder, deleteStandaloneReminder,
    clearAllNotesData, syncStandaloneReminders
} from './services/MessageNoteService';
import { MessageNote, ReminderNote } from './types/MessageNote';
import MessageNoteCard, { CATEGORY_META } from './components/MessageNoteCard';
import { useAuth } from '../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const CATEGORIES = [
    'All', 'Sunday Service', 'Bible Study', 'Prayer Cell',
    'Special Meeting', 'Youth Meeting', 'Other',
] as const;

export default function MessageNotesScreen() {
    const navigation = useNavigation<any>();
    const { isGuest, logout, user } = useAuth();

    const [notes, setNotes] = useState<MessageNote[]>([]);
    const [filtered, setFiltered] = useState<MessageNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeCategory, setActive] = useState('All');
    const [activeTab, setActiveTab] = useState<'my' | 'community'>(isGuest ? 'community' : 'my');

    // Force guest users to always be on community tab
    useEffect(() => {
        if (isGuest) setActiveTab('community');
    }, [isGuest]);
    const [showRmModal, setShowRmModal] = useState(false);

    // Standalone reminder states
    const [standaloneReminders, setStandaloneReminders] = useState<ReminderNote[]>([]);
    const [rmFormMode, setRmFormMode] = useState<'list' | 'add'>('list');
    const [editingReminder, setEditingReminder] = useState<ReminderNote | null>(null); // null = adding new
    const [rmTitle, setRmTitle] = useState('');
    const [rmMessage, setRmMessage] = useState('');
    const [rmTime, setRmTime] = useState(new Date());
    const [rmRepeat, setRmRepeat] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [rmSaving, setRmSaving] = useState(false);

    const loadStandaloneReminders = async () => {
        await syncStandaloneReminders();
        const data = await getStandaloneReminders();
        setStandaloneReminders(data);
    };

    useFocusEffect(
        useCallback(() => { load(); }, [activeTab])
    );

    const load = async () => {
        setLoading(true);
        const wasLoggedIn = !isGuest;
        try {
            const data = await getAllNotes(activeTab === 'community');

            // Detect if getAllNotes silently cleared the token (401 session expiry)
            if (wasLoggedIn && activeTab === 'my') {
                const token = await AsyncStorage.getItem('token');
                if (!token) {
                    // Token was cleared by the 401 handler — force logout
                    await logout();
                    Alert.alert(
                        'Session Expired',
                        'Your session has expired. Please log in again.',
                        [{ text: 'Login', onPress: () => navigation.navigate('Login') }]
                    );
                    setLoading(false);
                    return;
                }
            }

            // My Notes: exclude public notes (they belong to Community only)
            const filtered = activeTab === 'my'
                ? data.filter(n => !n.isPublic)
                : data;
            setNotes(filtered);
            applyFilter(filtered, activeCategory, search);
        } catch (error) {
            console.error('Failed to load notes', error);
        } finally {
            setLoading(false);
        }
    };

    const applyFilter = (data: MessageNote[], cat: string, q: string) => {
        let result = data;
        if (cat !== 'All') result = result.filter(n => n.category === cat);
        if (q.trim()) {
            const lower = q.toLowerCase();
            result = result.filter(n =>
                (n.title || '').toLowerCase().includes(lower) ||
                n.content.toLowerCase().includes(lower) ||
                (n.verse && n.verse.toLowerCase().includes(lower))
            );
        }
        setFiltered(result);
    };

    const onSearchChange = (text: string) => {
        setSearch(text);
        applyFilter(notes, activeCategory, text);
    };

    const onCategoryChange = (cat: string) => {
        setActive(cat);
        applyFilter(notes, cat, search);
    };

    const handleAddPress = () => {
        if (isGuest) {
            Alert.alert('Login Required', 'Guests cannot create notes.\nPlease login to unlock full features.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Login', onPress: () => navigation.navigate('Login') }
            ]);
            return;
        }
        navigation.navigate('NoteForm');
    };

    const handleDelete = (note: MessageNote) => {
        if (activeTab === 'community') {
            if (!user) return; // Guests can't delete
            // Only allow deletion if the logged-in user is the author
            const isOwner =
                note.authorEmail === user.email ||
                (note as any).user === user._id ||
                (note as any).user?._id === user._id;
            if (!isOwner) return;
        }

        Alert.alert('Delete Note', `Delete this note?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        await deleteNote((note as any)._id || note.id);
                        load();
                    } catch (err: any) {
                        if (err?.code === 'SESSION_EXPIRED') {
                            Alert.alert('Session Expired', 'Please log in again.', [{ text: 'Login', onPress: () => navigation.navigate('Login') }]);
                        }
                    }
                }
            },
        ]);
    };

    const handleClearAll = () => {
        Alert.alert(
            '🗑  Clear All Data',
            'This will permanently delete ALL notes, reminders, and cached data. This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear Everything',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await clearAllNotesData();
                            setNotes([]);
                            setFiltered([]);
                            setStandaloneReminders([]);
                            Alert.alert('Done', 'All notes and reminders have been cleared.');
                        } catch (e) {
                            Alert.alert('Error', 'Could not clear data. Try again.');
                        }
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.outer}>
            <StatusBar barStyle="light-content" backgroundColor="#146C94" />

            {/*  ── Gradient Header ── */}
            <LinearGradient colors={['#146C94', '#19A7CE']} style={styles.gradient}>
                <View style={styles.headerContainer}>
                    <View style={styles.headerTop}>
                        <View>
                            <Text style={styles.headerTitle}>Message Notes</Text>
                            <Text style={styles.headerSub}>
                                {isGuest
                                    ? 'Public community notes'
                                    : activeTab === 'my'
                                        ? `${notes.length} private note${notes.length !== 1 ? 's' : ''}`
                                        : `${notes.length} public note${notes.length !== 1 ? 's' : ''} shared`}
                            </Text>
                        </View>
                        <View style={styles.headerActions}>
                            {/* Reminder Bell — hidden for guests */}
                            {!isGuest && (
                                <TouchableOpacity
                                    style={styles.iconBtn}
                                    onPress={() => setShowRmModal(true)}
                                >
                                    <Ionicons name="alarm-outline" size={22} color="#fff" />
                                </TouchableOpacity>
                            )}
                            {/* Add Note */}
                            {!isGuest && (
                                <TouchableOpacity style={styles.addBtn} onPress={handleAddPress}>
                                    <Ionicons name="add" size={22} color="#146C94" />
                                </TouchableOpacity>
                            )}

                        </View>
                    </View>

                    {/* Tab Switcher — hidden for guests (they always see Community) */}
                    {!isGuest && (
                        <View style={styles.tabs}>
                            <TouchableOpacity
                                style={[styles.tab, activeTab === 'my' && styles.tabActive]}
                                onPress={() => setActiveTab('my')}
                            >
                                <Ionicons name="person" size={15} color={activeTab === 'my' ? '#146C94' : '#fff'} />
                                <Text style={[styles.tabText, activeTab === 'my' && styles.tabTextActive]}>My Notes</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tab, activeTab === 'community' && styles.tabActive]}
                                onPress={() => setActiveTab('community')}
                            >
                                <Ionicons name="earth" size={15} color={activeTab === 'community' ? '#146C94' : '#fff'} />
                                <Text style={[styles.tabText, activeTab === 'community' && styles.tabTextActive]}>Community</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/*  ── White content area ── */}
                <View style={styles.contentSheet}>
                    {/* Floating Search */}
                    <View style={styles.searchBox}>
                        <Ionicons name="search-outline" size={16} color="#146C94" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search notes, verses..."
                            value={search}
                            onChangeText={onSearchChange}
                            placeholderTextColor="#aaa"
                        />
                        {search.length > 0 && (
                            <TouchableOpacity onPress={() => onSearchChange('')}>
                                <Ionicons name="close-circle" size={16} color="#aaa" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Category Filter */}
                    <FlatList
                        horizontal
                        data={CATEGORIES as unknown as string[]}
                        keyExtractor={(item, index) => `cat-${index}-${item}`}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.catList}
                        style={{ flexGrow: 0, marginBottom: 4 }}
                        renderItem={({ item }) => {
                            const active = activeCategory === item;
                            const meta = item !== 'All' ? CATEGORY_META[item] : null;
                            return (
                                <TouchableOpacity
                                    style={[
                                        styles.catChip,
                                        active
                                            ? { backgroundColor: '#146C94', borderColor: '#146C94' }
                                            : { backgroundColor: '#fff', borderColor: meta?.color || '#146C94' },
                                    ]}
                                    onPress={() => onCategoryChange(item)}
                                >
                                    {meta && (
                                        <Ionicons
                                            name={meta.icon}
                                            size={13}
                                            color={active ? '#fff' : meta.color}
                                            style={{ marginRight: 5 }}
                                        />
                                    )}
                                    <Text style={[styles.catText, { color: active ? '#fff' : (meta?.color || '#146C94') }]}>
                                        {item}
                                    </Text>
                                </TouchableOpacity>
                            );
                        }}
                    />

                    {/* Note List */}
                    {loading ? (
                        <View style={styles.loader}>
                            <ActivityIndicator size="large" color="#146C94" />
                            <Text style={styles.loaderText}>Loading notes...</Text>
                        </View>
                    ) : filtered.length === 0 ? (
                        <View style={styles.empty}>
                            <View style={styles.emptyIconWrap}>
                                <Ionicons name="book-outline" size={56} color="#146C94" />
                            </View>
                            <Text style={styles.emptyTitle}>Nothing here yet</Text>
                            <Text style={styles.emptySub}>
                                {search
                                    ? 'No results match your search.'
                                    : activeTab === 'my'
                                        ? "Capture today's message highlights."
                                        : 'Be the first to share a public note.'}
                            </Text>
                            {!search && activeTab === 'my' && !isGuest && (
                                <TouchableOpacity style={styles.emptyAddBtn} onPress={handleAddPress}>
                                    <Ionicons name="add-circle" size={18} color="#fff" />
                                    <Text style={styles.emptyAddBtnText}>Start Writing</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        <FlatList
                            data={filtered}
                            keyExtractor={item => (item as any)._id || item.id}
                            contentContainerStyle={{ paddingBottom: 100 }}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => (
                                <MessageNoteCard
                                    note={item}
                                    isCommunity={activeTab === 'community'}
                                    onPress={() => navigation.navigate('NoteDetail', { noteId: (item as any)._id || item.id })}
                                    onLongPress={() => handleDelete(item)}
                                />
                            )}
                        />
                    )}
                </View>
            </LinearGradient>

            {/* ── Standalone Reminders Modal ── */}
            <Modal
                visible={showRmModal}
                transparent
                animationType="slide"
                onShow={loadStandaloneReminders}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {rmFormMode === 'list' ? '⏰ Reminders' : editingReminder ? '✏️ Edit Reminder' : '✨ New Reminder'}
                            </Text>
                            <TouchableOpacity onPress={() => { setShowRmModal(false); setRmFormMode('list'); }}>
                                <Ionicons name="close-circle" size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        {rmFormMode === 'list' ? (
                            <>
                                <ScrollView style={{ maxHeight: Dimensions.get('window').height * 0.5 }}>
                                    {standaloneReminders.length === 0 ? (
                                        <View style={{ padding: 30, alignItems: 'center' }}>
                                            <Ionicons name="notifications-off-outline" size={48} color="#ccc" />
                                            <Text style={{ marginTop: 12, color: '#94a3b8', fontSize: 15, fontWeight: '600' }}>No reminders yet.</Text>
                                            <Text style={{ color: '#cbd5e1', fontSize: 13, marginTop: 4, textAlign: 'center' }}>Tap below to set your first reminder.</Text>
                                        </View>
                                    ) : (
                                        standaloneReminders.map((item) => (
                                            <View key={item.id} style={styles.reminderCard}>
                                                <Ionicons name="alarm-outline" size={22} color="#146C94" />
                                                <View style={{ flex: 1, marginLeft: 12 }}>
                                                    <Text style={styles.rmTitle}>{item.title}</Text>
                                                    {item.message ? (
                                                        <Text style={styles.rmMessage} numberOfLines={2}>{item.message}</Text>
                                                    ) : null}
                                                    <Text style={styles.rmTime}>
                                                        {new Date(item.scheduledTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                        {item.repeating ? ' · Daily 🔁' : ''}
                                                    </Text>
                                                </View>
                                                {/* Edit button */}
                                                <TouchableOpacity
                                                    style={[styles.rmDeleteBtn, { backgroundColor: '#e0f2fe', marginRight: 8 }]}
                                                    onPress={() => {
                                                        setEditingReminder(item);
                                                        setRmTitle(item.title);
                                                        setRmMessage(item.message || '');
                                                        setRmTime(new Date(item.scheduledTime));
                                                        setRmRepeat(item.repeating || false);
                                                        setRmFormMode('add');
                                                    }}
                                                >
                                                    <Ionicons name="pencil-outline" size={18} color="#146C94" />
                                                </TouchableOpacity>
                                                {/* Delete button */}
                                                <TouchableOpacity
                                                    style={styles.rmDeleteBtn}
                                                    onPress={() => {
                                                        Alert.alert(
                                                            'Delete Reminder',
                                                            `Delete "${item.title}"?`,
                                                            [
                                                                { text: 'Cancel', style: 'cancel' },
                                                                {
                                                                    text: 'Delete',
                                                                    style: 'destructive',
                                                                    onPress: async () => {
                                                                        await deleteStandaloneReminder(item.id);
                                                                        loadStandaloneReminders();
                                                                    }
                                                                }
                                                            ]
                                                        );
                                                    }}
                                                >
                                                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                                                </TouchableOpacity>
                                            </View>
                                        ))
                                    )}
                                </ScrollView>

                                <TouchableOpacity
                                    style={styles.addRmFullBtn}
                                    onPress={() => {
                                        setEditingReminder(null);
                                        setRmTitle('');
                                        setRmMessage('');
                                        setRmTime(new Date());
                                        setRmRepeat(false);
                                        setRmFormMode('add');
                                    }}
                                >
                                    <Ionicons name="add-circle" size={20} color="#fff" />
                                    <Text style={{ color: '#fff', fontWeight: '800', marginLeft: 6 }}>Add New Reminder</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <View style={{ paddingTop: 10 }}>
                                <Text style={styles.formLabel}>Reminder Title *</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder='e.g. Read verse at 7 AM'
                                    value={rmTitle}
                                    onChangeText={setRmTitle}
                                    placeholderTextColor="#bbb"
                                />

                                <Text style={[styles.formLabel, { marginTop: 15 }]}>Simple Message (Optional)</Text>
                                <TextInput
                                    style={[styles.formInput, { minHeight: 60 }]}
                                    placeholder='e.g. Remember to pray for the family'
                                    value={rmMessage}
                                    onChangeText={setRmMessage}
                                    placeholderTextColor="#bbb"
                                    multiline
                                    textAlignVertical="top"
                                />

                                <Text style={[styles.formLabel, { marginTop: 15 }]}>Time</Text>
                                <TouchableOpacity style={styles.timePickerBtn} onPress={() => setShowTimePicker(true)}>
                                    <Ionicons name="time-outline" size={18} color="#146C94" />
                                    <Text style={{ color: '#146C94', fontWeight: '800', marginLeft: 8, fontSize: 16 }}>
                                        {rmTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </TouchableOpacity>
                                {showTimePicker && (
                                    <DateTimePicker
                                        value={rmTime}
                                        mode="time"
                                        display="default"
                                        onChange={(_, d) => { setShowTimePicker(false); if (d) setRmTime(d); }}
                                    />
                                )}

                                <TouchableOpacity style={styles.repeatToggle} onPress={() => setRmRepeat(p => !p)}>
                                    <Ionicons name={rmRepeat ? 'checkbox' : 'square-outline'} size={24} color="#146C94" />
                                    <Text style={{ marginLeft: 10, color: '#1e293b', fontSize: 14, fontWeight: '700' }}>Repeat daily</Text>
                                </TouchableOpacity>

                                <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                                    <TouchableOpacity
                                        style={[styles.formBtn, { backgroundColor: '#f1f5f9', flex: 1 }]}
                                        onPress={() => { setRmFormMode('list'); setEditingReminder(null); }}
                                    >
                                        <Text style={{ color: '#64748b', fontWeight: '800' }}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.formBtn, { backgroundColor: '#146C94', flex: 1, opacity: rmSaving ? 0.7 : 1 }]}
                                        disabled={rmSaving}
                                        onPress={async () => {
                                            if (!rmTitle.trim()) {
                                                Alert.alert('Oops', 'Please enter a title');
                                                return;
                                            }
                                            setRmSaving(true);
                                            try {
                                                if (editingReminder) {
                                                    // Update: delete old + re-add with new values
                                                    await deleteStandaloneReminder(editingReminder.id);
                                                    await addStandaloneReminder({
                                                        title: rmTitle.trim(),
                                                        message: rmMessage.trim() || undefined,
                                                        scheduledTime: rmTime.toISOString(),
                                                        repeating: rmRepeat,
                                                    });
                                                } else {
                                                    await addStandaloneReminder({
                                                        title: rmTitle.trim(),
                                                        message: rmMessage.trim() || undefined,
                                                        scheduledTime: rmTime.toISOString(),
                                                        repeating: rmRepeat,
                                                    });
                                                }
                                                await loadStandaloneReminders();
                                                setEditingReminder(null);
                                                setRmFormMode('list');
                                            } catch (e) {
                                                console.error(e);
                                                Alert.alert('Error', 'Failed to save reminder');
                                            } finally {
                                                setRmSaving(false);
                                            }
                                        }}
                                    >
                                        {rmSaving
                                            ? <ActivityIndicator color="#fff" size="small" />
                                            : <Text style={{ color: '#fff', fontWeight: '800' }}>
                                                {editingReminder ? 'Update Reminder' : 'Save Reminder'}
                                            </Text>
                                        }
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    outer: {
        flex: 1,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
        backgroundColor: '#146C94',
    },
    gradient: {
        flex: 1,
    },

    // ── Header ──
    headerContainer: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 20
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: '#F6F1F1',
        letterSpacing: -0.5,
    },
    headerSub: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.85)',
        marginTop: 2,
        fontWeight: '500',
    },

    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBtn: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeDot: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FF5252',
        borderWidth: 1.5,
        borderColor: '#fff',
    },
    addBtn: {
        backgroundColor: '#fff',
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 5,
    },

    // ── Tabs ──
    tabs: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.15)',
        borderRadius: 16,
        padding: 4,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 13,
        gap: 6,
    },
    tabActive: {
        backgroundColor: '#fff',
        elevation: 2,
    },
    tabText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
    tabTextActive: {
        color: '#146C94',
    },

    // ── Content Sheet ──
    contentSheet: {
        flex: 1,
        backgroundColor: '#F6F1F1',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
        paddingTop: 20,
        paddingHorizontal: 16,
    },

    // ── Search ──
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingHorizontal: 15,
        paddingVertical: 12,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        gap: 10,
        marginBottom: 14,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#333',
        fontWeight: '500',
    },

    // ── Category chips ──
    catList: {
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        alignItems: 'center',
    },
    catChip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 44,
        borderRadius: 22,
        borderWidth: 1.5,
        paddingHorizontal: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 4,
        marginRight: 8,
    },

    catText: {
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: -0.2,
    },

    // ── States ──
    loader: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
    },
    loaderText: {
        marginTop: 12,
        color: '#94a3b8',
        fontWeight: '600',
        fontSize: 14,
    },
    empty: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 80,
    },
    emptyIconWrap: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(20, 108, 148, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#146C94',
    },
    emptySub: {
        fontSize: 14,
        color: '#94a3b8',
        marginTop: 8,
        textAlign: 'center',
        paddingHorizontal: 40,
        lineHeight: 20,
    },
    emptyAddBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 24,
        backgroundColor: '#146C94',
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 30,
        elevation: 5,
        shadowColor: '#146C94',
        shadowOpacity: 0.4,
        shadowRadius: 10,
    },
    emptyAddBtnText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 16,
    },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', justifyContent: 'flex-end', zIndex: 100 },
    modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 40 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '900', color: '#1e293b' },

    reminderCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 16, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
    rmNoteTitle: { fontSize: 11, fontWeight: '800', color: '#146C94', textTransform: 'uppercase', marginBottom: 2 },
    rmTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
    rmMessage: { fontSize: 12, color: '#64748b', marginTop: 1, fontStyle: 'italic' },
    rmTime: { fontSize: 13, color: '#64748b', marginTop: 2 },

    rmDeleteBtn: { padding: 8, backgroundColor: '#fee2e2', borderRadius: 10 },

    addRmFullBtn: { flexDirection: 'row', backgroundColor: '#146C94', padding: 15, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 15 },
    formLabel: { fontSize: 12, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: 8 },
    formInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, fontSize: 15, color: '#1e293b' },
    timePickerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e0f2fe', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 12 },
    repeatToggle: { flexDirection: 'row', alignItems: 'center', marginTop: 15 },
    formBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    noteSelectChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', marginRight: 8, backgroundColor: '#f8fafc', maxWidth: 150 }
});
