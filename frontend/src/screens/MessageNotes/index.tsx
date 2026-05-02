// ════════════════════════════════════════════════
//  MessageNotes/index.tsx  —  Module Entry (List)
// ════════════════════════════════════════════════
import React, { useCallback, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList,
    ActivityIndicator, TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getAllNotes, deleteNote } from './services/MessageNoteService';
import { MessageNote } from './types/MessageNote';
import MessageNoteCard, { CATEGORY_META } from './components/MessageNoteCard';

const CATEGORIES = [
    'All', 'Sunday Service', 'Bible Study', 'Prayer Cell',
    'Special Meeting', 'Youth Meeting', 'Other',
];

export default function MessageNotesScreen() {
    const navigation = useNavigation<any>();

    const [notes, setNotes] = useState<MessageNote[]>([]);
    const [filtered, setFiltered] = useState<MessageNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeCategory, setActive] = useState('All');

    useFocusEffect(
        useCallback(() => { load(); }, [])
    );

    const load = async () => {
        setLoading(true);
        try {
            const data = await getAllNotes();
            setNotes(data);
            applyFilter(data, activeCategory, search);
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
                n.title.toLowerCase().includes(lower) ||
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

    const handleDelete = (note: MessageNote) => {
        Alert.alert('Delete Note', `Delete "${note.title}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    await deleteNote(note.id);
                    const updated = notes.filter(n => n.id !== note.id);
                    setNotes(updated);
                    applyFilter(updated, activeCategory, search);
                }
            },
        ]);
    };

    return (
        <View style={styles.container}>

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Message Notes</Text>
                    <Text style={styles.headerSub}>{notes.length} {notes.length === 1 ? 'note' : 'notes'} saved</Text>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('NoteForm')}>
                    <Ionicons name="add" size={22} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={16} color="#aaa" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search notes, verses…"
                    value={search}
                    onChangeText={onSearchChange}
                    placeholderTextColor="#bbb"
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => onSearchChange('')}>
                        <Ionicons name="close-circle" size={16} color="#ccc" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Category Filter — compact chips */}
            <View>
                <FlatList
                    horizontal
                    data={CATEGORIES}
                    keyExtractor={item => item}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.catList}
                    renderItem={({ item }) => {
                        const active = activeCategory === item;
                        const meta = item !== 'All' ? CATEGORY_META[item] : null;
                        return (
                            <TouchableOpacity
                                style={[styles.catChip,
                                active
                                    ? { backgroundColor: meta ? meta.color : '#1565C0', borderColor: meta ? meta.color : '#1565C0' }
                                    : { backgroundColor: '#fff', borderColor: meta ? meta.color : '#1565C0' }
                                ]}
                                onPress={() => onCategoryChange(item)}
                            >
                                {meta && <Ionicons name={meta.icon} size={10} color={active ? '#fff' : meta.color} />}
                                <Text style={[styles.catText, { color: active ? '#fff' : meta ? meta.color : '#1565C0' }]}>
                                    {item}
                                </Text>
                            </TouchableOpacity>
                        );
                    }}
                />
            </View>

            {/* Notes List */}
            {loading ? (
                <ActivityIndicator size="large" color="#1565C0" style={{ marginTop: 60 }} />
            ) : filtered.length === 0 ? (
                <View style={styles.empty}>
                    <Ionicons name="document-text-outline" size={56} color="#ddd" />
                    <Text style={styles.emptyTitle}>No notes found</Text>
                    <Text style={styles.emptySub}>
                        {search ? 'Try a different search.' : 'Tap + to add your first note.'}
                    </Text>
                    {!search && (
                        <TouchableOpacity style={styles.emptyAddBtn} onPress={() => navigation.navigate('NoteForm')}>
                            <Text style={styles.emptyAddBtnText}>Add Note</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ paddingBottom: 40, paddingTop: 4 }}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <MessageNoteCard
                            note={item}
                            onPress={() => navigation.navigate('NoteDetail', { noteId: item.id })}
                            onLongPress={() => handleDelete(item)}
                        />
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f6fb' },
    header: {
        backgroundColor: '#1565C0', paddingTop: 52, paddingBottom: 16,
        paddingHorizontal: 18, flexDirection: 'row',
        justifyContent: 'space-between', alignItems: 'center',
    },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
    headerSub: { fontSize: 12, color: '#90CAF9', marginTop: 2 },
    addBtn: {
        backgroundColor: 'rgba(255,255,255,0.2)', width: 40, height: 40,
        borderRadius: 20, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
    },
    searchBox: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
        marginHorizontal: 14, marginTop: -16, borderRadius: 12,
        paddingHorizontal: 12, paddingVertical: 9,
        elevation: 5, shadowColor: '#000', shadowOpacity: 0.1,
        shadowRadius: 8, gap: 8, marginBottom: 0,
    },
    searchInput: { flex: 1, fontSize: 13, color: '#333' },
    // Compact category chips
    catList: { paddingHorizontal: 14, paddingVertical: 8, gap: 6 },
    catChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 9, paddingVertical: 4,
        borderRadius: 20, borderWidth: 1.5, marginRight: 4,
    },
    catText: { fontSize: 11, fontWeight: '700' },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: '#ccc', marginTop: 10 },
    emptySub: {
        fontSize: 12, color: '#bbb', marginTop: 5,
        textAlign: 'center', paddingHorizontal: 40,
    },
    emptyAddBtn: {
        marginTop: 18, backgroundColor: '#1565C0',
        paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10,
    },
    emptyAddBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
