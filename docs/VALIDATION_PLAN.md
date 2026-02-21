# OrderBridge - 6-Week Validation Plan
## From Idea to Product-Market Fit Signal

---

## 🎯 Objective

Validate that OrderBridge can achieve:
1. **Adoption**: Customers actually use the portal (not just email)
2. **Value**: Measurable reduction in rework time and errors
3. **Revenue**: Willingness to pay $500-1,500/month

**Kill Criteria (if ANY are true at Week 6):**
- ❌ Less than 15 qualified interviews with real pain
- ❌ Unable to get 3 real orders through the system
- ❌ Willingness-to-pay below $400/month
- ❌ Customers still prefer email after trying portal

---

## 📅 Week-by-Week Plan

### Week 1: Discovery Sprint

**Goal:** Validate pain exists and understand exact workflow

**Activities:**
- [ ] Conduct 20 interviews (target: 15 qualified)
  - 10 Export Sales Directors / Managers
  - 10 Sales Ops / Merchandisers
- [ ] Document canonical workflow
- [ ] Identify top 3 pain points with severity scores
- [ ] Score all prospects with ICP Scorecard
- [ ] Identify 5 potential pilot candidates (Score > 70)

**Interview Script Focus:**
1. Current order process (step by step)
2. Time spent on rework (hours/week)
3. Error frequency and cost
4. Modification handling
5. Tools currently used
6. Budget and decision process

**Deliverables:**
- [ ] 20 completed interview notes
- [ ] ICP Scorecard for each prospect
- [ ] Canonical workflow diagram
- [ ] Pain point ranking with quotes
- [ ] 5 pilot candidate list

**Success Metric:**
✅ 15+ interviews confirm significant pain (>10 hours/week on orders)
✅ 5 prospects willing to consider pilot

---

### Week 2: Concierge MVP

**Goal:** Prove the workflow works without heavy development

**Activities:**
- [ ] Build minimal prototype:
  - Simple catalog display (Notion/Airtable + webpage)
  - Excel upload form
  - Manual validation and response
  - Proforma PDF generation
- [ ] Import 1 customer's Excel price list (manually cleaned)
- [ ] Set up 1 buyer account
- [ ] Process 1 test order end-to-end

**"Concierge" Approach:**
- Customer uploads Excel
- YOU manually process it
- YOU validate SKUs and quantities
- YOU generate proforma
- YOU send confirmation
- Track time at each step

**Deliverables:**
- [ ] Working prototype URL
- [ ] 1 customer catalog imported
- [ ] 1 buyer account created
- [ ] 1 test order completed
- [ ] Time log for each step

**Success Metric:**
✅ Complete order flow works (even if manual)
✅ Process takes < 15 minutes (target for automation)

---

### Week 3-4: Paid Pilots (3 customers)

**Goal:** Get real orders from real customers paying real money

**Pilot Setup (per customer):**
- [ ] Import their Excel catalog (you do it)
- [ ] Set up 1-3 of their buyers
- [ ] Configure pricing (if different per buyer)
- [ ] Train admin contact (30 min call)
- [ ] Announce to buyers (email from supplier)

**Pilot Terms:**
- Duration: 2 weeks active use
- Price: $300-800/month (signal willingness to pay)
- Setup fee: $500-2,000 (validates budget)
- Commitment: Process at least 5 real orders

**KPIs to Track:**

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Orders through portal | 5+ per pilot | System count |
| Rework time reduction | >30% | Before/after comparison |
| Proforma creation time | -50% | Time tracking |
| Error rate | <2% | Error log |
| Buyer adoption | >50% | % orders via portal vs email |

**Weekly Check-ins:**
- What's working?
- What's frustrating?
- What's missing?
- Would you continue using this?
- Would you pay $X/month?

**Deliverables:**
- [ ] 3 paying pilot customers
- [ ] 15+ real orders processed
- [ ] KPI dashboard per customer
- [ ] Weekly feedback notes
- [ ] Testimonial quotes (if positive)

**Success Metric:**
✅ 2/3 pilots complete 5+ orders via portal
✅ Measurable time savings documented
✅ At least 1 pilot says "I would pay for this"

---

### Week 5: Product Iteration

**Goal:** Build only what pilots desperately need

**Based on Pilot Feedback, Build:**

Priority A (Must have):
- [ ] Tolerant Excel import (fuzzy SKU matching)
- [ ] Basic pricing rules
- [ ] Notification system (email)
- [ ] Proforma PDF generation
- [ ] Order status tracking

Priority B (Should have):
- [ ] Substitution workflow (if requested)
- [ ] Payment status (if requested)
- [ ] Better validation messages

Priority C (Skip for now):
- [ ] WeCom integration
- [ ] ERP integration
- [ ] Advanced analytics

**Deliverables:**
- [ ] Updated product with Priority A features
- [ ] Deploy to all 3 pilot customers
- [ ] Collect feedback on improvements

**Success Metric:**
✅ Pilots say "this is much better"
✅ New features used within 24 hours

---

### Week 6: Decision Gate

**Goal:** Go / No-Go decision based on evidence

**Data to Review:**

| Question | Evidence Required |
|----------|-------------------|
| Do they have the pain? | 15+ interviews confirmed |
| Does the solution work? | 15+ orders processed |
| Will they pay? | 3 paying pilots |
| Will buyers adopt? | >50% orders via portal |
| Can we deliver value? | >30% time saved |

**Decision Matrix:**

| Scenario | Evidence | Decision |
|----------|----------|----------|
| 🟢 All metrics hit | Strong PMF signal | Scale to 10 customers |
| 🟡 Partial (3/5) | Pivot needed | Identify weak point, iterate |
| 🟠 Low adoption | Buyers prefer email | Pivot to "Excel automation" (backend only) |
| 🔴 Low WTP | Won't pay $400+ | Reconsider pricing/value |
| ⚫ All fail | No PMF | Kill or major pivot |

**Go Decision Criteria:**
- [ ] ≥2 pilots want to continue post-trial
- [ ] ≥1 pilot willing to sign annual contract
- [ ] NPS ≥ 30 from pilot users
- [ ] Clear path to $10K MRR in 6 months

**Deliverables:**
- [ ] Final KPI report
- [ ] Customer testimonials (video if possible)
- [ ] Go/No-Go recommendation
- [ ] 90-day roadmap (if Go)
- [ ] Post-mortem (if No-Go)

---

## 📊 Tracking Template

### Weekly Dashboard

```
Week: [X]
Date: [YYYY-MM-DD]

DISCOVERY
- Interviews completed: [X] / 20
- Qualified prospects: [X] / 15
- Pilot candidates: [X] / 5

PILOTS
- Active pilots: [X] / 3
- Orders processed: [X]
- Orders via portal: [X]%
- Avg time saved: [X]%

REVENUE
- Setup fees collected: $[X]
- Monthly fees: $[X]
- Pipeline value: $[X]

PRODUCT
- Features shipped: [list]
- Bugs reported: [X]
- Top request: [X]

RISKS
- [Risk 1]
- [Risk 2]

NEXT WEEK FOCUS
- [Priority 1]
- [Priority 2]
- [Priority 3]
```

---

## 💰 Budget (6 Weeks)

| Item | Cost | Notes |
|------|------|-------|
| Development (if freelance) | $5,000-10,000 | Or founder time |
| Tools (Notion, Airtable, etc.) | $200 | Monthly |
| Hosting/infra | $100 | Vercel + Supabase free tier |
| Travel (if visiting customers) | $1,000-3,000 | Optional but valuable |
| Incentives (pilot discounts) | $0-500 | Usually not needed |
| **Total** | **$6,000-15,000** | Or mostly sweat equity |

**Revenue Target:**
- 3 pilots × $500/month = $1,500 MRR
- 3 pilots × $1,000 setup = $3,000 one-time
- **Net investment: $3,000-12,000** (if pilots pay)

---

## 📞 Outreach Templates

### Cold Email (English)

```
Subject: Saw you're hiring sales ops - quick question

Hi [Name],

I noticed [Company] is expanding your export team. Quick question:

How much time does your team spend on order clarifications and modifications each week?

We're building a tool specifically for Chinese exporters to reduce order rework by 70%+. 
Not a marketplace - just a simple portal for your existing customers to reorder without the Excel back-and-forth.

Would you have 15 minutes this week for a quick call? Happy to share what other [industry] exporters are doing.

[Your name]
```

### WeChat Message (Chinese)

```
你好 [Name]，

我看到贵司在招聘销售运营。想请教一下：

你们团队每周花多少时间处理订单修改和确认？

我们专门为中国出口企业开发了一个工具，可以减少70%以上的订单返工。
不是平台，就是一个简单的门户，让你的老客户可以直接下单，不用Excel来回沟通。

这周有15分钟聊聊吗？可以分享一下其他[行业]出口商的做法。

[Your name]
```

---

## ⚠️ Common Pitfalls to Avoid

1. **Building too much before validation**
   - Don't spend 2 months coding before talking to customers
   - Concierge first, automate later

2. **Accepting "nice to have" feedback as validation**
   - "Interesting" ≠ "I will pay"
   - Push for commitment: pilot signup, payment

3. **Only talking to friendly prospects**
   - Include skeptics
   - "Why wouldn't this work for you?"

4. **Ignoring the buyer side**
   - Supplier loves it, but buyers still email = fail
   - Must validate buyer adoption

5. **Perfect product syndrome**
   - "Just one more feature" before pilot
   - Ship ugly, learn fast, iterate

---

## 🎯 Success Definition

At the end of 6 weeks, you should know:

1. **YES, proceed** if:
   - Clear pain validated with evidence
   - Solution works (orders processed)
   - Customers will pay (money received)
   - Buyers will adopt (>50% via portal)
   
2. **PIVOT** if:
   - Pain exists but solution doesn't fit
   - Buyers won't adopt portal → backend automation only
   - Pricing too high → simplify or segment down

3. **KILL** if:
   - Pain is not severe enough
   - Alternatives (Excel) are "good enough"
   - No budget / decision maker access
   - Market too fragmented
