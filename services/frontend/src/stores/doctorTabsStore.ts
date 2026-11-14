import { create } from 'zustand';
import { DoctorTab, ClinicalRecord } from '../types';

interface DoctorTabsState {
  tabs: DoctorTab[];
  activeTabId: string | null;
  openTab: (encounterId: number, patientCode: string, patientName: string, initialRecord?: Partial<ClinicalRecord>, isLocked?: boolean) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  setSubTab: (tabId: string, subTab: 'consultation' | 'history') => void;
  updateDraftRecord: (tabId: string, partialData: Partial<DoctorTab['draftRecord']>) => void;
  setLocked: (tabId: string, isLocked: boolean) => void;
}

export const useDoctorTabsStore = create<DoctorTabsState>((set) => ({
  tabs: [],
  activeTabId: null,

  openTab: (encounterId, patientCode, patientName, initialRecord, isLocked = false) => {
    const tabId = `enc-${encounterId}`;
    set((state) => {
      const existingTab = state.tabs.find((t) => t.id === tabId);
      if (existingTab) {
        return { activeTabId: tabId };
      }

      const newTab: DoctorTab = {
        id: tabId,
        encounterId,
        patientCode,
        patientName,
        activeSubTab: 'consultation',
        draftRecord: {
          chief_complaint: initialRecord?.chief_complaint || '',
          present_illness: initialRecord?.present_illness || '',
          medical_history: initialRecord?.medical_history || '',
          physical_exam: initialRecord?.physical_exam || '',
          final_diagnosis: initialRecord?.final_diagnosis || '',
          treatment_plan: initialRecord?.treatment_plan || '',
          follow_up_recommendation: initialRecord?.follow_up_recommendation || '',
        },
        isLocked: isLocked || initialRecord?.is_locked || false,
      };

      return {
        tabs: [...state.tabs, newTab],
        activeTabId: tabId,
      };
    });
  },

  closeTab: (tabId) => {
    set((state) => {
      const newTabs = state.tabs.filter((t) => t.id !== tabId);
      let newActiveTabId = state.activeTabId;

      if (state.activeTabId === tabId) {
        newActiveTabId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
      }

      return {
        tabs: newTabs,
        activeTabId: newActiveTabId,
      };
    });
  },

  setActiveTab: (tabId) => {
    set({ activeTabId: tabId });
  },

  setSubTab: (tabId, subTab) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId ? { ...tab, activeSubTab: subTab } : tab
      ),
    }));
  },

  updateDraftRecord: (tabId, partialData) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId
          ? { ...tab, draftRecord: { ...tab.draftRecord, ...partialData } }
          : tab
      ),
    }));
  },

  setLocked: (tabId, isLocked) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId ? { ...tab, isLocked } : tab
      ),
    }));
  },
}));
