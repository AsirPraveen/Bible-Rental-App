import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Platform, StatusBar, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { MapPin, List as ListIcon } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import Constants from 'expo-constants';
import LoadingScreen from '../../components/LoadingScreen';
import { useTheme, ColorsType } from '../../context/ThemeContext';

const apiUrl = Constants.expoConfig?.extra?.apiUrl || 'http://192.168.1.13:5001';

export default function HistoricalMapsScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await axios.get(`${apiUrl}/api/maps/locations`);
        if (res.data && res.data.data) {
          const formatted = res.data.data.map((loc: any) => ({
            ...loc,
            id: loc._id
          }));
          setLocations(formatted);
        }
      } catch (error) {
        console.error('Error fetching dynamic maps:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchLocations();
  }, []);
  
  // Sort locations chronologically
  const sortedLocations = useMemo(() => {
    return [...locations].sort((a, b) => a.periodStart - b.periodStart);
  }, [locations]);

  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);
  
  const formatYear = (year: number) => {
    return year < 0 ? `${Math.abs(year)} BC` : `${year} AD`;
  };

  const webViewRef = useRef<WebView>(null);
  const flatListRef = useRef<FlatList>(null);

  const focusMapOnLocation = useCallback((id: string) => {
    setActiveLocationId(id);
    if (webViewRef.current) {
      // JSON.stringify safely escapes quotes so the JS string doesn't break
      webViewRef.current.injectJavaScript(`window.focusLocation(${JSON.stringify(id)}); true;`);
    }
  }, []);

  // HTML content integrating Leaflet.js for interactive mapping
  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { padding: 0; margin: 0; }
        html, body, #map { height: 100%; width: 100%; }
        .leaflet-popup-content-wrapper { border-radius: 8px; }
        .popup-title { font-weight: bold; color: #146C94; font-size: 16px; margin: 0 0 4px 0; font-family: sans-serif; }
        .popup-date { color: #E91E63; font-weight: bold; font-size: 12px; margin: 0 0 8px 0; font-family: sans-serif; }
        .popup-desc { font-size: 13px; color: #444; margin: 0; font-family: sans-serif; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map').setView([31.7683, 35.2137], 7);
        
        // Use a terrain/satellite style map to feel historical
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Tiles &copy; Esri'
        }).addTo(map);

        var markersMap = {};

        // Expose function to React Native to initialize all markers
        window.initMarkers = function(locationsStr) {
          var locations = JSON.parse(locationsStr);
          locations.forEach(function(loc) {
            var marker = L.marker([loc.latitude, loc.longitude]).addTo(map);
            var yearStr = loc.periodStart < 0 ? Math.abs(loc.periodStart) + ' BC' : loc.periodStart + ' AD';
            var endStr = loc.periodEnd < 0 ? Math.abs(loc.periodEnd) + ' BC' : loc.periodEnd + ' AD';
            
            var popupContent = '<div class="popup-title">' + loc.name + '</div>' +
                               '<div class="popup-date">' + yearStr + ' - ' + endStr + '</div>' +
                               '<div class="popup-desc">' + loc.description + '</div>';
            marker.bindPopup(popupContent);
            markersMap[loc.id] = marker;
            
            // Allow clicking a marker to notify React Native
            marker.on('click', function() {
                window.ReactNativeWebView.postMessage(loc.id);
            });
          });
        };

        // Fly to and open popup for a specific marker
        window.focusLocation = function(id) {
          if (markersMap[id]) {
            map.flyTo(markersMap[id].getLatLng(), 8, { animate: true, duration: 1.2 });
            markersMap[id].openPopup();
          }
        };
      </script>
    </body>
    </html>
  `;

  const renderLocationItem = ({ item, index }: { item: any, index: number }) => {
    const isActive = activeLocationId === item.id;
    return (
      <TouchableOpacity 
        style={[styles.locationCard, isActive && styles.locationCardActive]} 
        onPress={() => focusMapOnLocation(item.id)}
        activeOpacity={0.7}
      >
        <MapPin color={isActive ? colors.tint : colors.textSecondary} size={24} style={styles.pinIcon} />
        <View style={styles.locInfo}>
          <Text style={[styles.locName, isActive && styles.locNameActive]}>{item.name}</Text>
          <Text style={styles.locDate}>{formatYear(item.periodStart)} - {formatYear(item.periodEnd)}</Text>
          <Text style={styles.locDesc} numberOfLines={3}>{item.description}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.outer_container}>
      <LinearGradient colors={colors.linearGradient} style={styles.gradient}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.headerTextWrapper}>
            <Text style={styles.headerText}>Historical Maps</Text>
            <Text style={styles.subtitleText}>Explore the biblical world</Text>
          </View>
        </View>
        
        <View style={styles.container}>


      {/* Map */}
      <View style={styles.mapContainer}>
        {loading ? (
          <LoadingScreen message="Loading maps..." />
        ) : (
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: mapHtml }}
            style={styles.map}
            scrollEnabled={false}
            bounces={false}
            javaScriptEnabled={true}
            onLoadEnd={() => {
              const locationsJson = JSON.stringify(sortedLocations);
              webViewRef.current?.injectJavaScript(`window.initMarkers(${JSON.stringify(locationsJson)}); true;`);
              
              if (sortedLocations.length > 0) {
                 setTimeout(() => focusMapOnLocation(sortedLocations[0].id), 500); 
              }
            }}
            onMessage={(event) => {
              const id = event.nativeEvent.data;
              setActiveLocationId(id);
              const index = sortedLocations.findIndex(l => l.id === id);
              if (index !== -1 && flatListRef.current) {
                flatListRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
              }
            }}
          />
        )}
      </View>

      {/* Locations List */}
      <View style={styles.listContainer}>
        <View style={styles.listHeader}>
          <ListIcon color={colors.tint} size={20} />
          <Text style={styles.listTitle}>Chronological Locations</Text>
        </View>
        <Text style={styles.listSubtitle}>{sortedLocations.length} significant sites recorded</Text>
        
        <FlatList
          ref={flatListRef}
          data={sortedLocations}
          keyExtractor={(item) => item.id}
          renderItem={renderLocationItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onScrollToIndexFailed={(info) => {
            // Failsafe for scrollToIndex if the item isn't rendered yet
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
            }, 500);
          }}
        />
      </View>

        </View>

      </LinearGradient>
    </SafeAreaView>
  );
}

const getStyles = (colors: ColorsType) => StyleSheet.create({
  outer_container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: colors.background,
  },
  gradient: { flex: 1 },
  headerContainer: { padding: 20, paddingTop: 16, flexDirection: 'row', alignItems: 'center' },
  headerTextWrapper: { flex: 1, alignItems: 'center' },
  headerText: { fontSize: 24, fontWeight: 'bold', color: colors.textLight, textAlign: 'center', marginBottom: 4 },
  subtitleText: { fontSize: 14, color: colors.textLight, textAlign: 'center', opacity: 0.9 },
  container: { flex: 1, backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  
  mapContainer: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: colors.theme === 'dark' ? colors.surface : '#E5E3DF',
  },
  map: {
    flex: 1,
  },
  
  listContainer: {
    backgroundColor: colors.cardBg,
    height: 380,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    marginTop: -20,
    paddingTop: 16,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  listSubtitle: {
    paddingHorizontal: 20,
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  locationCard: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'flex-start',
  },
  locationCardActive: {
    backgroundColor: colors.theme === 'dark' ? colors.surface : '#F0F8FA',
    borderColor: colors.secondary,
    elevation: 2,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  pinIcon: {
    marginTop: 4,
    marginRight: 12,
  },
  locInfo: {
    flex: 1,
  },
  locName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  locNameActive: {
    color: colors.tint,
  },
  locDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E91E63',
    marginBottom: 6,
  },
  locDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
