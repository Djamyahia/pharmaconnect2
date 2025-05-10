import { supabase } from './supabase';
import type { Region, RegionWithDeliveryDays } from '../types/supabase';

// Get all regions
export async function getRegions(): Promise<Region[]> {
  try {
    const { data, error } = await supabase
      .from('regions')
      .select('*');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching regions:', error);
    return [];
  }
}

// Get region by ID
export async function getRegionById(id: string): Promise<Region | null> {
  try {
    const { data, error } = await supabase
      .from('regions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching region:', error);
    return null;
  }
}

// Get region by wilaya
export async function getRegionByWilaya(wilaya: string): Promise<Region | null> {
  try {
    const { data, error } = await supabase
      .from('regions')
      .select('*')
      .contains('wilayas', [wilaya]);

    if (error) throw error;
    return data?.[0] || null;
  } catch (error) {
    console.error('Error fetching region by wilaya:', error);
    return null;
  }
}

// Get delivery days for a wholesaler in a specific region
export async function getDeliveryDays(wholesalerId: string, regionId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('wholesaler_delivery_days')
      .select('delivery_days')
      .eq('wholesaler_id', wholesalerId)
      .eq('region_id', regionId)
      .maybeSingle();

    if (error) throw error;
    return data?.delivery_days || [];
  } catch (error) {
    console.error('Error fetching delivery days:', error);
    return [];
  }
}

// Get all regions with delivery days for a wholesaler
export async function getRegionsWithDeliveryDays(wholesalerId: string): Promise<RegionWithDeliveryDays[]> {
  try {
    const { data: regions, error: regionsError } = await supabase
      .from('regions')
      .select('*');

    if (regionsError) throw regionsError;

    const { data: deliveryDays, error: daysError } = await supabase
      .from('wholesaler_delivery_days')
      .select('*')
      .eq('wholesaler_id', wholesalerId);

    if (daysError) throw daysError;

    return (regions || []).map(region => {
      const deliveryDay = deliveryDays?.find(d => d.region_id === region.id);
      return {
        ...region,
        delivery_days: deliveryDay?.delivery_days || []
      };
    });
  } catch (error) {
    console.error('Error fetching regions with delivery days:', error);
    return [];
  }
}