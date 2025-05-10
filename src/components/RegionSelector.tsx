import React, { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { RegionWithDeliveryDays } from '../types/supabase';

type RegionSelectorProps = {
  onRegionChange: (region: RegionWithDeliveryDays | null) => void;
  selectedRegion: RegionWithDeliveryDays | null;
};

export function RegionSelector({
  onRegionChange,
  selectedRegion
}: RegionSelectorProps) {
  const { user } = useAuth();
  const [regions, setRegions] = useState<RegionWithDeliveryDays[]>([]);
  const [loading, setLoading] = useState(true);
  const [defaultApplied, setDefaultApplied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // 1) On charge la liste des régions
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('regions')
        .select('*');
      if (error) console.error(error);
      setRegions(data || []);
      setLoading(false);
    })();
  }, []);

  // 2) Une fois chargées, on applique la région par défaut, si l'utilisateur n'a rien choisi
  useEffect(() => {
    if (
      !loading &&
      regions.length > 0 &&
      user?.id &&
      !selectedRegion &&
      !defaultApplied
    ) {
      (async () => {
        // Récupère la wilaya du pharmacien
        const { data: profile, error: profErr } = await supabase
          .from('users')
          .select('wilaya')
          .eq('id', user.id)
          .single();
        if (profErr || !profile?.wilaya) {
          setDefaultApplied(true);
          return;
        }

        // Cherche la région qui contient cette wilaya
        const match = regions.find(r =>
          r.wilayas.includes(profile.wilaya)
        );
        if (match) onRegionChange(match);
        setDefaultApplied(true);
      })();
    }
  }, [loading, regions, user, selectedRegion, defaultApplied, onRegionChange]);

  const handleRegionClick = (region: RegionWithDeliveryDays) => {
    onRegionChange(region);
    setIsOpen(false);
  };

  const clearRegion = () => {
    onRegionChange(null);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(open => !open)}
        className="flex items-center px-4 py-2 border rounded-md bg-white shadow-sm text-sm"
      >
        <MapPin className="mr-2" />
        {selectedRegion ? selectedRegion.name : 'Jours de livraison par région'}
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-56 bg-white shadow-lg rounded-md py-1 ring-1 ring-black ring-opacity-5">
          {loading ? (
            <div className="px-4 py-2 text-sm text-gray-500">Chargement...</div>
          ) : (
            <>
              <button
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={clearRegion}
              >
                Toutes les régions
              </button>
              {regions.map(region => (
                <button
                  key={region.id}
                  className={`w-full text-left px-4 py-2 text-sm ${
                    selectedRegion?.id === region.id
                      ? 'bg-indigo-100 text-indigo-900'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => handleRegionClick(region)}
                >
                  {region.name}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
