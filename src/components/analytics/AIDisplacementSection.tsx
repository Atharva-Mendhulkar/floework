import React from 'react';
import { useGetAiDisplacementQuery } from '@/store/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Sparkles } from 'lucide-react';

export default function AIDisplacementSection() {
    const { data: res, isLoading } = useGetAiDisplacementQuery();
    
    if (isLoading) {
        return <div className="h-64 bg-slate-50 animate-pulse rounded-2xl border border-slate-100 mt-6" />;
    }

    const data = res?.data || [];

    return (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm flex flex-col overflow-hidden mt-6">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <Sparkles className="text-purple-500" size={16} />
                <h3 className="text-sm font-semibold text-slate-900">AI & Deep Work</h3>
            </div>
            
            <div className="p-6 pb-8 min-h-[220px]">
                {data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-6 h-full">
                        <Sparkles className="text-slate-300 mb-3" size={24} />
                        <p className="text-sm font-semibold text-slate-700">Not enough data yet</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-xs">Start tagging AI-assisted sessions in the Focus Zone to see your displacement pattern.</p>
                    </div>
                ) : (
                    <div className="flex flex-col h-full w-full">
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={[...data].reverse()}
                                    margin={{ top: 20, right: 30, left: -20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis 
                                        dataKey="weekLabel" 
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 11, fill: '#64748B' }}
                                        dy={10}
                                        tickFormatter={(val) => {
                                            const parts = val.split('-W');
                                            return `W${parts[1]}`;
                                        }}
                                    />
                                    <YAxis 
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 11, fill: '#64748B' }}
                                    />
                                    <Tooltip 
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                                    <Bar dataKey="aiHours" name="AI-Assisted" stackId="a" fill="#A855F7" radius={[0, 0, 4, 4]} maxBarSize={40} />
                                    <Bar dataKey="humanHours" name="Human Focus" stackId="a" fill="#6366F1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        {data[0]?.insightText && (
                            <p className="text-sm text-slate-600 mt-6 italic bg-slate-50 p-4 rounded-xl border border-slate-100">
                                {data[0].insightText}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
