// src/features/training/screens/TrainingsFeed.screen.tsx
import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  LayoutChangeEvent,
} from 'react-native';
import { FAB, Text } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import MonthlyGoalsSummary from '@/features/training/components/MonthlyGoalsSummary';
import MonthlyGoalsMini from '@/features/training/components/MonthlyGoalsMini';
import ReadinessMini from '@/features/readiness/components/ReadinessMini';
import type { TrainingRecord } from '@/shared/lib/training';
import { listPaginated } from '@/features/training/storage';
import TrainingListItem from '@/features/training/components/TrainingListItem';
import { Card, Title, Paragraph } from 'react-native-paper';
import { remove as removeTraining } from '@/features/training/storage';


const PAGE_SIZE = 4;            // koľko načítať na 1 stránku
const MAX_TOPUP_PAGES = 2;      // koľko stránok max. dotiahnuť navyše pri prvom loade
// Konštanta pre FAB (typicky 56px + okraj)
const FAB_SPACE = 72;
const FAB_GAP = 12;                   // medzera medzi FABmi
const BOTTOM_PADDING = FAB_SPACE * 2 + FAB_GAP; // ⬅️ bolo FAB_SPACE + 8

// deduplikácia podľa id (pre istotu)
const mergeUniqueById = (prev: TrainingRecord[], next: TrainingRecord[]) => {
  const seen = new Set(prev.map(i => i.id));
  const merged = [...prev];
  for (const it of next) if (!seen.has(it.id)) merged.push(it);
  return merged;
};


export default function TrainingsFeedScreen() {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const navigation = useNavigation<any>();
  const { t, i18n } = useTranslation();

  const [items, setItems] = useState<TrainingRecord[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // stráže a merania
  const lastRequestedCursor = useRef<string | null>(null);
  const listLayoutHeight = useRef(0);
  const contentHeightRef = useRef(0);
  const canScroll = () => contentHeightRef.current > listLayoutHeight.current + 1;

  // top-up: jednorazové dopĺňanie po prvom loade, aby vznikol scroll
  const didTopUp = useRef(false);
  const topUpCount = useRef(0);

  // guard proti duplicitnému onEndReached z „momentum“ scrollu
  const endReachedDuringMomentum = useRef(false);

  const onListLayout = (e: LayoutChangeEvent) => {
    listLayoutHeight.current = e.nativeEvent.layout.height;
  };

  // pokus o top-up, ak ešte nie je scroll a ešte sa dá dotiahnuť, automaticke doplnanie feedu po prvom loade
  const maybeTopUp = useCallback(() => {
    if (didTopUp.current) return;
    if (!loading && hasMore && !canScroll() && topUpCount.current < MAX_TOPUP_PAGES) {
      topUpCount.current += 1;
      void load(false);
    } else if (canScroll() || !hasMore || topUpCount.current >= MAX_TOPUP_PAGES) {
      // od tejto chvíle už ďalší top-up nerob
      didTopUp.current = true;
    }
  }, [hasMore, loading]); // load použijeme nižšie cez `void load(false)`

  const onContentSizeChange = (_w: number, h: number) => {
    contentHeightRef.current = h;
    // po každom naraste obsahu skús top-up (ak ešte beží fáza dopĺňania)
    maybeTopUp();
  };

  const load = useCallback(async (reset: boolean) => {
    //Nevolaj ďalší load, ak už jeden beží
    if (loading) return;
    // Ak resetujem, tak začínam odznova
    const currentCursor = reset ? null : cursor;
    // Ak už som požiadal o tento cursor, tak nič nerob
    if (!reset && lastRequestedCursor.current === currentCursor) return;
    // Zapamätaj si, že som o tento cursor už požiadal
    lastRequestedCursor.current = currentCursor;

    setLoading(true);
    try {
      // Načítaj ďalšiu stránku
      const res = await listPaginated({ limit: PAGE_SIZE, cursor: currentCursor });
      // Pridaj načítané položky do zoznamu (alebo resetni, ak je to reset)
      setItems(prev => (reset ? res.items : mergeUniqueById(prev, res.items)));
      // Nastav nový cursor
      setCursor(res.nextCursor ?? null);
      // Nastav, či je ešte viac dát
      const noMore = !res.nextCursor || (res.items?.length ?? 0) < PAGE_SIZE;
      setHasMore(!noMore);
    } catch (e) {
      // 👇 umožní opakovať ten istý cursor po chybe
      lastRequestedCursor.current = null;
      // (voliteľne) zobraz toast/log
    } finally {
      setLoading(false);
      if (reset) setRefreshing(false);
    }
  }, [cursor, loading]);


  // Pri focus-e načítaj prvú stránku a povoľ top-up
  useFocusEffect(
    React.useCallback(() => {
      setRefreshing(true);
      lastRequestedCursor.current = null;
      didTopUp.current = false;
      topUpCount.current = 0;
      endReachedDuringMomentum.current = false;
      void load(true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  // Nekonečný scroll: po top-up fáze sa bude sťahovať už len pri skrolovaní
  const onEndReached = () => {
    if (endReachedDuringMomentum.current) return;
    if (loading || !hasMore || !canScroll()) return;
    endReachedDuringMomentum.current = true;
    void load(false);
  };

  return (
    <View style={styles.container }>
            {/* ---- RAD PRE 2 MINI-KARTY (polovičná šírka) ---- */}
      <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 12 }}>
        <MonthlyGoalsMini style={{ flex: 1, minWidth: 0 }} />
        <ReadinessMini style={{ flex: 1, minWidth: 0 }} />
        {/* Druhú polovicu nahradíš svojím widgetom */}
        {/* <YourOtherWidget style={{ width: '50%' }} /> */}
      </View>
      <FlatList
        //Zoznam dat - treningy
        data={items}
        //Kazdy item ma svoje id, na rychli render vo Flatliste
        keyExtractor={(it) => it.id}
        //Komoponent na vykreslenie jedneho itemu
  renderItem={({ item }) => (
    <TrainingListItem
      item={item}
      expanded={expandedId === item.id}
      onPress={() => setExpandedId(expandedId === item.id ? null : item.id)}
      onEdit={() => navigation.navigate('RecordDetail', { id: item.id, edit: true })}
      onRemove={async () => {
        await removeTraining(item.id);
        setExpandedId(null);
        // optimisticky odstráň z listu
        setItems((prev) => prev.filter((r) => r.id !== item.id));
      }}
    />
  )}
  extraData={expandedId}
        // pull-to-refresh - nad listou, potiahnutim zavola load(true)
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        // ulozi vysku listu
        onLayout={onListLayout}
        // ulozi vysku obsahu
        onContentSizeChange={onContentSizeChange}
        // guard proti duplicitnému onEndReached z „momentum“ scrollu, pri začiatku inerciálneho scrollu (onMomentumScrollBegin) resetneš flag,
        onMomentumScrollBegin={() => { endReachedDuringMomentum.current = false; }}
        onScrollBeginDrag={() => { endReachedDuringMomentum.current = false; }}
        //zavolá sa, keď sa používateľ priblíži ku koncu (stránkovanie).
        onEndReached={onEndReached}
        // spodny loader ak je viac stranok a uz mas aspon jednu polozku
        ListFooterComponent={
          loading && hasMore && items.length > 0 ? <ActivityIndicator style={{ margin: 16 }} /> : null
        }
        //Treshold = 20 znamená, že keď sa užívateľ priblíži na 20% od konca obsahu, spustí sa onEndReached
        onEndReachedThreshold={0.2}
        // jemné tuny
        windowSize={7}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={16}
        removeClippedSubviews
        // prázdny stav (alebo loading)
        ListEmptyComponent={
          <View style={styles.empty}>
            {loading ? (
              <ActivityIndicator />
            ) : (
              <>
                <Text variant="titleMedium">{t('screens.trainingsFeed.subtitle')}</Text>
                <Text variant="bodyMedium">{t('screens.trainingsFeed.addnew')}</Text>
              </>
            )}
          </View>
        }
        //ak je list prázdny, nech zaberie celý priestor (aby sa pull-to-refresh dal použiť aj tak)
          contentContainerStyle={[
          items.length === 0 ? { flex: 1 } : null,
          { paddingBottom: BOTTOM_PADDING }, // 👈 kľúčové
        ]}
        // pri kliku na item sa skryje klávesnica ak bola otvorená
        keyboardShouldPersistTaps="handled"
      />
      
<View pointerEvents="box-none" style={styles.fabColumn}>
  {/* Readiness (srdiečko, červené) */}
  <FAB
    icon="heart"
    color="#fff"
    accessibilityLabel={t('screens.trainingsFeed.readinnessAdd', { defaultValue: 'Add readiness' })}
    style={[styles.fabBase, { backgroundColor: '#ef4444', marginBottom: 12 }]}
    onPress={() => navigation.navigate('ReadinessLog')}
  />

  {/* Add Training (plus, zelené) */}
  <FAB
    icon="plus"
    color="#fff"
    accessibilityLabel={t('screens.trainingsFeed.addnew')}
    style={[styles.fabBase, { backgroundColor: 'green' }]}
    onPress={() => navigation.navigate('AddTraining')}
  />
</View>
    </View>
  );
}

const styles = StyleSheet.create({
    widgetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',          // na menších displejoch karty pod seba
    gap: 12,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
  },
  list: { flex: 1 },
  container: { flex: 1, backgroundColor: '#f3f6fa' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  fab: { position: 'absolute', right: 16, bottom: 24, backgroundColor: 'green' },
    fabBase: {
    // žiadne position:absolute → nech sa skladajú pod seba
    // prípadné tiene/okrúhlenia si berie FAB z paperu
  },
    fabColumn: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    alignItems: 'flex-end',
  },
});
