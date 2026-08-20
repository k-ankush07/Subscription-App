import { Page } from '@shopify/polaris'
import React, { useState } from 'react'

// Teeno cards ka data array - id ke saath
const purchaseCards = [
  {
    id: 'card-1',
    variant: 'simple',
    price: 'Rs. 895.00',
    subPrice: 'Rs. 805.50',
    discountLabel: '10% off',
    deliverEvery: 'month',
  },
  {
    id: 'card-2',
    variant: 'detailed',
    price: 'Rs. 895.00',
    subPrice: 'Rs. 805.50',
    bannerLabel: 'Save 10% on every delivery',
    deliverEvery: 'month',
    benefits: [
      '10% of all recurring orders',
      'Lowest price option',
      'Easily swap & skip deliveries',
      'Cancel quickly anytime',
    ],
  },
  {
    id: 'card-3',
    variant: 'compact',
    price: 'Rs. 895.00',
    subPrice: 'Rs. 805.50',
    deliverEvery: 'month',
  },
]

const styles = {
  wrapper: {
    display: 'flex',
    gap: 24,
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    background: '#f1f1f1',
    padding: 24,
  },
  card: {
    background: '#fff',
    borderRadius: 8,
    padding: 20,
    width: 340,
    boxSizing: 'border-box',
    fontFamily: 'sans-serif',
  },
  optionBoxUnselected: {
    border: '1px solid #d0d0d0',
    borderRadius: 8,
    padding: '14px 16px',
    marginBottom: 12,
  },
  optionBoxSelected: {
    border: '2px solid #111',
    borderRadius: 8,
    padding: '14px 16px',
    marginBottom: 12,
  },
  radioOuter: (checked) => ({
    width: 20,
    height: 20,
    borderRadius: '50%',
    border: `2px solid ${checked ? '#111' : '#999'}`,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  }),
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: '#111',
  },
  badge: {
    background: '#eee',
    color: '#333',
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 12,
    padding: '2px 10px',
    marginLeft: 8,
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: '#111',
    color: '#fff',
    fontSize: 11,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  chooseBtn: {
    width: '100%',
    background: '#111',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '12px 0',
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
    marginTop: 12,
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: '#555',
    fontSize: 13,
    marginTop: 4,
  },
}


function Widgets2() {
  const [selectedMap, setSelectedMap] = useState(
    purchaseCards.reduce((acc, c) => ({ ...acc, [c.id]: 'subscribe' }), {})
  )

  const select = (id, value) => setSelectedMap((prev) => ({ ...prev, [id]: value }))

  return (
    <Page title="Choose a template">
      <div style={styles.wrapper}>
        {purchaseCards.map((data) => {
          const selected = selectedMap[data.id]

          if (data.variant === 'simple') {
            return (
              <div key={data.id} style={styles.card}>
                <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 13, letterSpacing: 1, marginBottom: 16, borderBottom: '1px solid #ddd', paddingBottom: 10 }}>
                  PURCHASE OPTIONS
                </div>

                <div
                  style={selected === 'onetime' ? styles.optionBoxSelected : styles.optionBoxUnselected}
                  onClick={() => select(data.id, 'onetime')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={styles.radioOuter(selected === 'onetime')}>
                        {selected === 'onetime' && <span style={styles.radioInner} />}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 16 }}>One time purchase</span>
                    </div>
                    <span style={{ fontWeight: 600 }}>{data.price}</span>
                  </div>
                </div>

                <div
                  style={selected === 'subscribe' ? styles.optionBoxSelected : styles.optionBoxUnselected}
                  onClick={() => select(data.id, 'subscribe')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <span style={styles.radioOuter(selected === 'subscribe')}>
                      {selected === 'subscribe' && <span style={styles.radioInner} />}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>Subscribe & save</span>
                    <span style={styles.badge}>{data.discountLabel}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 32 }}>
                    <span style={{ color: '#555' }}>Deliver every {data.deliverEvery}</span>
                    <span style={{ fontWeight: 700 }}>{data.subPrice}</span>
                  </div>
                </div>

                <div style={styles.infoRow}>
                   Subscription details
                </div>
                <button style={styles.chooseBtn}>Choose</button>
              </div>
            )
          }

          if (data.variant === 'detailed') {
            return (
              <div key={data.id} style={styles.card}>
                <div style={styles.optionBoxUnselected} onClick={() => select(data.id, 'onetime')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={styles.radioOuter(selected === 'onetime')}>
                        {selected === 'onetime' && <span style={styles.radioInner} />}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 16 }}>One time purchase</span>
                    </div>
                    <span style={{ fontWeight: 600 }}>{data.price}</span>
                  </div>
                </div>

                <div style={{ background: '#e8e8e8', textAlign: 'center', fontWeight: 600, fontSize: 13, padding: '8px 0', marginBottom: -1 }}>
                  {data.bannerLabel}
                </div>

                <div style={{ border: '2px solid #111', borderRadius: 8, padding: 16, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={styles.radioOuter(true)}>
                        <span style={styles.radioInner} />
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 16 }}>Subscribe & save</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ background: '#eee', fontWeight: 700, padding: '4px 10px', borderRadius: 4 }}>{data.subPrice}</div>
                      <div style={{ color: '#999', textDecoration: 'line-through', fontSize: 13, marginTop: 2 }}>{data.price}</div>
                    </div>
                  </div>

                  <div style={{ fontWeight: 700, marginTop: 16, marginBottom: 10 }}>How subscriptions work:</div>
                  {data.benefits.map((b, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                      <span style={styles.checkCircle}>✓</span>
                      <span>{b}</span>
                    </div>
                  ))}
                  <div style={{ textAlign: 'right', color: '#333', fontSize: 14, marginTop: 8 }}>
                    Deliver every:<br />{data.deliverEvery}
                  </div>
                </div>

                <div style={styles.infoRow}>
                   Subscription details
                </div>
                <button style={styles.chooseBtn}>Choose</button>
              </div>
            )
          }

          return (
            <div key={data.id} style={{ ...styles.card, width: 300 }}>
              <div style={{ border: '2px dashed #bbb', borderRadius: 8, padding: 16, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: 4, background: '#111',
                    color: '#fff', display: 'inline-flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 13, flexShrink: 0, marginTop: 2,
                  }}>
                    ✓
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>
                      Subscribe & save{' '}
                      <span style={{ color: '#999', textDecoration: 'line-through', fontWeight: 400, fontSize: 14 }}>
                        {data.price}
                      </span>{' '}
                      <span style={{ fontWeight: 700 }}>{data.subPrice}</span>
                    </div>
                    <div style={{ color: '#555', marginTop: 6 }}>Deliver every: {data.deliverEvery}</div>
                  </div>
                </div>
              </div>
              <div style={styles.infoRow}>
                 Subscription details
              </div>
              <button style={styles.chooseBtn}>Choose</button>
            </div>
          )
        })}
      </div>
    </Page>
  )
}

export default Widgets2