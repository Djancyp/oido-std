'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { Skill } from '@/app/api/skills/route';
import { useSkillsQuery } from '@/hooks/skills';

type SkillsContextType = {
  skills: Skill[];
  isLoading: boolean;
  byLevel: (level: Skill['level']) => Skill[];
  find: (name: string) => Skill | undefined;
};

const SkillsContext = createContext<SkillsContextType | undefined>(undefined);

export function SkillsProvider({
  children,
  initialSkills = [],
}: {
  children: ReactNode;
  initialSkills?: Skill[];
}) {
  const { data: skills = [], isLoading } = useSkillsQuery({
    initialData: initialSkills.length > 0 ? initialSkills : undefined,
  });

  const byLevel = (level: Skill['level']) => skills.filter(s => s.level === level);
  const find = (name: string) => skills.find(s => s.name === name);

  return (
    <SkillsContext.Provider value={{ skills, isLoading, byLevel, find }}>
      {children}
    </SkillsContext.Provider>
  );
}

const EMPTY: SkillsContextType = {
  skills: [], isLoading: false,
  byLevel: () => [], find: () => undefined,
};

export function useSkills() {
  return useContext(SkillsContext) ?? EMPTY;
}
