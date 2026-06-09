'use client';

import React from 'react';
import { BLOCK_SPECS, BlockType, BlockDef } from '@/lib/blockTypes';

interface Theme {
  bg: string; hb: string; card: string; sec: string;
  tx: string; tm: string; td: string; ib: string; ibg: string;
  cb: string; ac: string; can: string;
}

/** Все типы блоков для выпадающего списка */
const ALL_TYPES = Object.entries(BLOCK_SPECS) as [BlockType, typeof BLOCK_SPECS[BlockType]][];

interface BlockPanelProps {
  blocks: BlockDef[];
  setBlocks: (updater: BlockDef[] | ((prev: BlockDef[]) => BlockDef[])) => void;
  selBlockId: string | null;
  onSelect: (id: string | null) => void;
  theme: Theme;
}

/** Получить тип по названию — ищет в BLOCK_SPECS */
function changeBlockType(block: BlockDef, newType: BlockType): BlockDef {
  const spec = BLOCK_SPECS[newType];
  return { ...block, type: newType, label: spec.label, icon: spec.icon, props: { ...spec.defaultProps } };
}

export default function BlockPanel({ blocks, setBlocks, selBlockId, onSelect, theme: th }: BlockPanelProps) {
  const selB = selBlockId ? blocks.find(b => b.id === selBlockId) : null;

  // Позиция блока
  const getPos = (b: BlockDef, all: BlockDef[]): { x: number; y: number } => {
    if (b.parent) {
      const p = all.find(x => x.id === b.parent);
      if (p) {
        const pi = all.indexOf(p);
        const ci = p.children.indexOf(b.id);
        return { x: 120 + pi * 20 + 240, y: 100 + pi * 30 + ci * 90 };
      }
    }
    const i = all.indexOf(b);
    return { x: 100 + i * 20, y: 100 + i * 30 };
  };

  const addBlock = () => {
    const id = 'b_' + Date.now();
    const firstType = (Object.keys(BLOCK_SPECS)[0] || 'product') as BlockType;
    const spec = BLOCK_SPECS[firstType];
    const nb: BlockDef = { id, type: firstType, label: spec.label, icon: spec.icon, props: { ...spec.defaultProps }, children: [], parent: null };
    setBlocks(prev => [...prev, nb]);
    setTimeout(() => onSelect(id), 50);
  };

  // Определяем выходные точки для соединений (справа блока)
  // и входные (слева)
  const OUTPUT_SIDE = 'right';
  const INPUT_SIDE = 'left';

  return (
    <>
      {/* Кнопка "+ Блок" */}
      <div style={{ padding:'6px 10px', display:'flex', alignItems:'center', gap:6, borderBottom:`1px solid ${th.cb}`, background:th.hb, position:'sticky', top:0, zIndex:10 }}>
        <button onClick={addBlock}
          style={{ padding:'4px 12px', fontSize:11, fontWeight:600, background:th.ac, color:'#fff', border:'none', borderRadius:5, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
          + Блок
        </button>
        <span style={{ fontSize:10, color:th.tm }}>перетаскивайте блоки чтобы соединить</span>
      </div>

      {/* Блоки на канве */}
      {blocks.map(b => {
        const spec = BLOCK_SPECS[b.type];
        const sel = b.id === selBlockId;
        const pos = getPos(b, blocks);
        const hasChildren = spec.childTypes && spec.childTypes.length > 0;
        return (
          <div key={b.id} style={{
            position:'absolute', left:pos.x, top:pos.y, width:200,
            background:th.bg, borderRadius:10,
            border: sel ? `2px solid ${spec.color}` : `1px solid ${th.cb}`,
            overflow:'hidden',
            boxShadow: sel ? `0 0 14px ${spec.color}50` : '0 2px 8px rgba(0,0,0,0.12)',
            cursor:'pointer', zIndex: sel ? 20 : 10,
          }} onClick={() => onSelect(b.id)}>
            {/* Шапка с выпадающим списком */}
            <div style={{
              padding:'5px 8px', background:spec.color, color:'#fff',
              fontSize:11, fontWeight:600,
              display:'flex', alignItems:'center', gap:4,
              position:'relative',
            }}>
              <span>{spec.icon}</span>
              <select value={b.type} onChange={e => {
                const newType = e.target.value as BlockType;
                setBlocks(prev => prev.map(x => x.id === b.id ? changeBlockType(x, newType) : x));
              }}
                onClick={e => e.stopPropagation()}
                style={{
                  flex:1, background:'transparent', border:'none', color:'#fff',
                  fontSize:11, fontWeight:600, outline:'none', cursor:'pointer',
                  WebkitAppearance:'none', MozAppearance:'none', appearance:'none',
                }}>
                {ALL_TYPES.map(([type, sp]) => (
                  <option key={type} value={type} style={{ color:'#000' }}>{sp.icon} {sp.label}</option>
                ))}
              </select>
              <button style={{ background:'rgba(255,255,255,0.2)', border:'none', color:'#fff', borderRadius:4, padding:'1px 6px', cursor:'pointer', fontSize:10 }}
                onClick={e => { e.stopPropagation(); setBlocks(prev => prev.filter(x => x.id !== b.id)); if (selBlockId === b.id) onSelect(null); }}>
                ✕
              </button>
            </div>

            {/* Входная точка (слева) — для соединения с родителем */}
            {!b.parent && (
              <div style={{
                position:'absolute', left:-6, top:'50%', marginTop:-5,
                width:10, height:10, borderRadius:'50%',
                background:th.sec, border:`2px solid ${spec.color}`,
                cursor:'crosshair', zIndex:5,
              }} />
            )}

            {/* Выходная точка (справа) — если может иметь детей */}
            {hasChildren && (
              <div style={{
                position:'absolute', right:-6, top:'50%', marginTop:-5,
                width:10, height:10, borderRadius:'50%',
                background:spec.color, border:`2px solid #fff`,
                cursor:'crosshair', zIndex:5,
              }} />
            )}

            {/* Поля блока */}
            <div style={{ padding:'6px 8px', fontSize:11, color:th.tx }}>
              {spec.props.filter(p => {
                // Показываем не-селекты и короткие селекты
                return !(p.type === 'select' && p.options && p.options.length > 6);
              }).slice(0, 5).map(p => {
                const v = b.props[p.key] ?? spec.defaultProps[p.key];
                const displayVal = p.type === 'select'
                  ? (p.options?.find(o => o.value === v)?.label || v)
                  : v;
                return (
                  <div key={p.key} style={{ display:'flex', justifyContent:'space-between', padding:'2px 0', borderBottom:`1px solid ${th.cb}`, fontSize:10 }}>
                    <span style={{ color:th.tm, marginRight:4 }}>{p.label}:</span>
                    <span style={{ fontWeight:500, textAlign:'right', maxWidth:100, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{displayVal}</span>
                  </div>
                );
              })}
              {/* Кнопка "Соединить" если блок без родителя и может иметь родителей */}
              {/* Показываем подсказку о соединении */}
              {!b.parent && blocks.length > 1 && (
                <div style={{ marginTop:4, fontSize:8, color:th.td, textAlign:'center' }}>
                  {b.children.length > 0 ? `${b.children.length} связей` : 'Соедините с другим блоком →'}
                </div>
              )}
              {b.parent && (
                <div style={{ marginTop:4, fontSize:8, color:spec.color, textAlign:'center' }}>
                  ← связан с блоком
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* SVG линии связей */}
      {blocks.length > 0 && (
        <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}>
          {blocks.flatMap(b =>
            b.children.map(childId => {
              const child = blocks.find(c => c.id === childId);
              if (!child) return null;
              const pPos = getPos(b, blocks);
              const cPos = getPos(child, blocks);
              const x1 = pPos.x + 200;
              const y1 = pPos.y + 30;
              const x2 = cPos.x;
              const y2 = cPos.y + 30;
              const mx = (x1 + x2) / 2;
              return (
                <path key={`${b.id}->${childId}`}
                  d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
                  stroke={BLOCK_SPECS[b.type].color}
                  strokeWidth={2} fill="none" strokeDasharray="4,3"
                  opacity={0.5} />
              );
            })
          )}
        </svg>
      )}

      {/* Редактор выбранного блока — правая панель */}
      {selB && (
        <div style={{ padding:'10px 12px', borderBottom:'1px solid ' + th.cb, fontSize:12, fontWeight:600, color:th.tx, display:'flex', alignItems:'center', gap:6, background:BLOCK_SPECS[selB.type].color }}>
          <span style={{ color:'#fff' }}>{BLOCK_SPECS[selB.type].icon} {BLOCK_SPECS[selB.type].label}</span>
        </div>
      )}
      {selB && (
        <div style={{ flex:1, overflowY:'auto', padding:12 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {BLOCK_SPECS[selB.type].props.map(p => {
              const val = selB.props[p.key] ?? BLOCK_SPECS[selB.type].defaultProps[p.key];
              return (
                <div key={p.key}>
                  <label style={{ display:'block', fontSize:10, fontWeight:500, color:th.tm, marginBottom:2 }}>{p.label}</label>
                  {p.type === 'select' ? (
                    <select value={String(val)} onChange={e => setBlocks(prev => prev.map(b => b.id === selB.id ? {...b, props: {...b.props, [p.key]: e.target.value}} : b))}
                      style={{ width:'100%', padding:'5px 8px', borderRadius:5, border:'1px solid ' + th.ib, background:th.ibg, color:th.tx, fontSize:11, outline:'none' }}>
                      {p.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <input type="text" inputMode={p.type==='number'?'decimal':'text'}
                      value={val === null || val === undefined || val === '' ? '' : String(val)}
                      onChange={e => setBlocks(prev => prev.map(b => b.id === selB.id ? {...b, props: {...b.props, [p.key]: p.type==='number' ? (e.target.value ? Number(e.target.value) : '') : e.target.value}} : b))}
                      placeholder={p.label}
                      style={{ width:'100%', padding:'5px 8px', borderRadius:5, border:'1px solid ' + th.ib, background:th.ibg, color:th.tx, fontSize:11, outline:'none' }} />
                  )}
                </div>
              );
            })}

            {/* Управление дочерними связями */}
            {selB.parent && (
              <div style={{ fontSize:10, color:th.tm, padding:'6px 0', borderTop:'1px solid ' + th.cb, marginTop:4 }}>
                Связан с: <span style={{ color:BLOCK_SPECS[blocks.find(b => b.id === selB.parent)?.type || 'product'].color, fontWeight:600 }}>
                  {blocks.find(b => b.id === selB.parent)?.label || ''}
                </span>
                <button onClick={() => {
                  const pid = selB.parent;
                  setBlocks(prev => prev.map(b => b.id === pid ? {...b, children: b.children.filter(c => c !== selB.id)} : b).map(b => b.id === selB.id ? {...b, parent: null} : b));
                }}
                  style={{ marginLeft:6, background:'transparent', border:'none', color:'#ef4444', cursor:'pointer', fontSize:10, textDecoration:'underline' }}>
                  отвязать
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
