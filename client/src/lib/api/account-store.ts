import { format, subDays, addDays } from 'date-fns'
import type {
  Address,
  AddressSnapshot,
  AppNotification,
  BookingDetail,
  Conversation,
  Message,
} from '@/types/account'

const STORE_KEY = 'r4f-account-store-v1'
const STORE_VERSION = 1

export interface AccountStoreState {
  version: number
  bookings: BookingDetail[]
  conversations: Conversation[]
  messages: Message[]
  notifications: AppNotification[]
  addresses: Address[]
  wishlistIds: string[]
}

const today = new Date()

// Helper to create dates relative to today
const relDate = (daysDiff: number, timeStr = '10:00'): string => {
  const d = daysDiff >= 0 ? addDays(today, daysDiff) : subDays(today, Math.abs(daysDiff))
  const dateStr = format(d, 'yyyy-MM-dd')
  return `${dateStr}T${timeStr}:00Z`
}

const relDateOnly = (daysDiff: number): string => {
  const d = daysDiff >= 0 ? addDays(today, daysDiff) : subDays(today, Math.abs(daysDiff))
  return format(d, 'yyyy-MM-dd')
}

const HOME_ADDRESS_SNAPSHOT: AddressSnapshot = {
  name: 'Aarav Mehta',
  line1: '24 Residency Road',
  line2: 'Near Trinity Metro Station',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560001',
  country: 'India',
}

const OFFICE_ADDRESS_SNAPSHOT: AddressSnapshot = {
  name: 'Aarav Mehta',
  line1: 'Prestige Tech Park, Block C, 4th Floor',
  line2: 'Marathahalli-Sarjapur Outer Ring Road',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560103',
  country: 'India',
}

export function createInitialAccountState(): AccountStoreState {
  const b1_start = relDateOnly(7)
  const b1_end = relDateOnly(9) // 3 days inclusive

  const b2_start = relDateOnly(3)
  const b2_end = relDateOnly(4) // 2 days inclusive

  const b3_start = relDateOnly(0)
  const b3_end = relDateOnly(1) // 2 days inclusive

  const b4_start = relDateOnly(-5)
  const b4_end = relDateOnly(-5) // 1 day inclusive

  const b5_start = relDateOnly(-12)
  const b5_end = relDateOnly(-12) // 1 day inclusive

  const b6_start = relDateOnly(-20)
  const b6_end = relDateOnly(-19) // 2 days inclusive

  const b7_start = relDateOnly(-35)
  const b7_end = relDateOnly(-34) // 2 days inclusive

  const bookings: BookingDetail[] = [
    // 1. Pending, 2 vendors (one accepted, one rejected with reason), unpaid
    {
      booking_id: 'BK-1042',
      event_name: 'Ananya & Arjun Wedding',
      event_type: 'Wedding',
      status: 'pending',
      payment_status: 'unpaid',
      start_date: b1_start,
      end_date: b1_end,
      rental_days: 3,
      delivery_city: 'Bengaluru',
      vendor_count: 2,
      item_count: 3,
      vendor_avatars: [
        { id: 'v_sargam', name: 'Sargam Sound Systems', initials: 'SS' },
        { id: 'v_lumina', name: 'Lumina Lighting Co.', initials: 'LL' },
      ],
      total_amount: 43232,
      action_needed: ['Payment due', 'Vendor declined an item'],
      created_at: relDate(-1, '14:30'),
      delivery_address: { ...HOME_ADDRESS_SNAPSHOT },
      price_summary: {
        subtotal: 23400,
        discount: 1000,
        coupon_code: 'CELEBRATE10',
        tax: 4032,
        delivery_fee: 1200,
        security_deposit: 15600,
        total: 43232,
      },
      deposit: {
        held: 15600,
        deducted: 0,
        refunded: 0,
        pending_refund: 15600,
      },
      payments: [],
      vendor_orders: [
        {
          vendor_order_id: 'VO-1042-1',
          vendor_id: 'v_sargam',
          vendor_name: 'Sargam Sound Systems',
          vendor_initials: 'SS',
          status: 'accepted',
          subtotal: 15000,
          item_ids: ['BI-1042-1'],
          delivery: {
            type: 'delivery',
            status: 'scheduled',
            scheduled_window: 'Between 09:00 AM  to  11:00 AM',
            updated_at: relDate(-1, '16:00'),
          },
        },
        {
          vendor_order_id: 'VO-1042-2',
          vendor_id: 'v_lumina',
          vendor_name: 'Lumina Lighting Co.',
          vendor_initials: 'LL',
          status: 'rejected',
          rejection_reason: 'Equipment booked for scheduled routine maintenance on selected dates.',
          subtotal: 8400,
          item_ids: ['BI-1042-2'],
        },
      ],
      items: [
        {
          item_id: 'BI-1042-1',
          equipment_id: 'eq_speaker_pair_01',
          name: 'Pro Line-Array Speaker Pair',
          image_url: '/images/equipment/line-array-speaker.svg',
          unit_price: 2500,
          quantity: 2,
          days: 3,
          total_price: 15000,
          status: 'confirmed',
          vendor_id: 'v_sargam',
          vendor_name: 'Sargam Sound Systems',
          review: null,
          damage_report: null,
        },
        {
          item_id: 'BI-1042-2',
          equipment_id: 'eq_light_moving_head_07',
          name: 'Moving Head Light (Pair)',
          image_url: '/images/equipment/stage-lights.svg',
          unit_price: 2800,
          quantity: 1,
          days: 3,
          total_price: 8400,
          status: 'cancelled',
          vendor_id: 'v_lumina',
          vendor_name: 'Lumina Lighting Co.',
          review: null,
          damage_report: null,
        },
      ],
      activity: [
        {
          id: 'ACT-1042-1',
          title: 'Booking Placed',
          description: 'Awaiting vendor confirmation and payment.',
          timestamp: relDate(-1, '14:30'),
          type: 'order',
        },
        {
          id: 'ACT-1042-2',
          title: 'Sargam Sound Systems accepted item',
          description: 'Pro Line-Array Speaker Pair confirmed for delivery.',
          timestamp: relDate(-1, '15:10'),
          type: 'order',
        },
        {
          id: 'ACT-1042-3',
          title: 'Lumina Lighting Co. declined item',
          description: 'Equipment under maintenance.',
          timestamp: relDate(-1, '15:45'),
          type: 'order',
        },
      ],
    },

    // 2. Confirmed upcoming, partial advance payment, 1 vendor
    {
      booking_id: 'BK-1038',
      event_name: 'Annual Tech Symposium',
      event_type: 'Corporate',
      status: 'confirmed',
      payment_status: 'partial',
      start_date: b2_start,
      end_date: b2_end,
      rental_days: 2,
      delivery_city: 'Bengaluru',
      vendor_count: 1,
      item_count: 1,
      vendor_avatars: [
        { id: 'v_sargam', name: 'Sargam Sound Systems', initials: 'SS' },
      ],
      total_amount: 15860,
      action_needed: ['Payment due'],
      created_at: relDate(-3, '11:15'),
      delivery_address: { ...OFFICE_ADDRESS_SNAPSHOT },
      price_summary: {
        subtotal: 7000,
        discount: 0,
        tax: 1260,
        delivery_fee: 600,
        security_deposit: 7000,
        total: 15860,
      },
      deposit: {
        held: 7000,
        deducted: 0,
        refunded: 0,
        pending_refund: 7000,
      },
      payments: [
        {
          payment_id: 'PAY-1038-1',
          booking_id: 'BK-1038',
          event_name: 'Annual Tech Symposium',
          type: 'advance',
          method: 'upi',
          amount: 8000,
          status: 'success',
          created_at: relDate(-3, '11:20'),
          reference: 'TXN••••8412',
        },
      ],
      vendor_orders: [
        {
          vendor_order_id: 'VO-1038-1',
          vendor_id: 'v_sargam',
          vendor_name: 'Sargam Sound Systems',
          vendor_initials: 'SS',
          status: 'accepted',
          subtotal: 7000,
          item_ids: ['BI-1038-1'],
          delivery: {
            type: 'delivery',
            status: 'scheduled',
            scheduled_window: 'Between 10:00 AM  to  12:00 PM',
            updated_at: relDate(-2, '10:00'),
          },
        },
      ],
      items: [
        {
          item_id: 'BI-1038-1',
          equipment_id: 'eq_dj_controller_06',
          name: 'DJ Controller + Mixer Setup',
          image_url: '/images/equipment/dj-mixer.svg',
          unit_price: 3500,
          quantity: 1,
          days: 2,
          total_price: 7000,
          status: 'confirmed',
          vendor_id: 'v_sargam',
          vendor_name: 'Sargam Sound Systems',
          review: null,
          damage_report: null,
        },
      ],
      activity: [
        {
          id: 'ACT-1038-1',
          title: 'Booking Placed',
          description: 'Initial booking request submitted.',
          timestamp: relDate(-3, '11:15'),
          type: 'order',
        },
        {
          id: 'ACT-1038-2',
          title: 'Advance Payment Received',
          description: '₹8,000 paid via UPI.',
          timestamp: relDate(-3, '11:20'),
          type: 'payment',
        },
        {
          id: 'ACT-1038-3',
          title: 'Order Confirmed',
          description: 'Sargam Sound Systems scheduled delivery.',
          timestamp: relDate(-2, '10:00'),
          type: 'order',
        },
      ],
    },

    // 3. In-progress, 2 vendors (1 out for delivery, 1 delivered with proof)
    {
      booking_id: 'BK-1031',
      event_name: 'Bangalore Indie Music Fest',
      event_type: 'Concert',
      status: 'in_progress',
      payment_status: 'paid',
      start_date: b3_start,
      end_date: b3_end,
      rental_days: 2,
      delivery_city: 'Bengaluru',
      vendor_count: 2,
      item_count: 6,
      vendor_avatars: [
        { id: 'v_sargam', name: 'Sargam Sound Systems', initials: 'SS' },
        { id: 'v_lumina', name: 'Lumina Lighting Co.', initials: 'LL' },
      ],
      total_amount: 28314,
      action_needed: [],
      created_at: relDate(-2, '09:00'),
      delivery_address: { ...HOME_ADDRESS_SNAPSHOT },
      price_summary: {
        subtotal: 12800,
        discount: 500,
        coupon_code: 'FEST500',
        tax: 2214,
        delivery_fee: 1000,
        security_deposit: 12800,
        total: 28314,
      },
      deposit: {
        held: 12800,
        deducted: 0,
        refunded: 0,
        pending_refund: 12800,
      },
      payments: [
        {
          payment_id: 'PAY-1031-1',
          booking_id: 'BK-1031',
          event_name: 'Bangalore Indie Music Fest',
          type: 'full',
          method: 'card',
          amount: 28314,
          status: 'success',
          created_at: relDate(-2, '09:05'),
          reference: 'TXN••••3190',
        },
      ],
      vendor_orders: [
        {
          vendor_order_id: 'VO-1031-1',
          vendor_id: 'v_sargam',
          vendor_name: 'Sargam Sound Systems',
          vendor_initials: 'SS',
          status: 'dispatched',
          subtotal: 5600,
          item_ids: ['BI-1031-1'],
          delivery: {
            type: 'delivery',
            status: 'out_for_delivery',
            scheduled_window: 'Between 11:00 AM  to  01:00 PM',
            tracking_info: 'Driver: Ramesh Kumar (KA-01-AB-1234)',
            delivered_by: 'Sargam Logistics',
            updated_at: relDate(0, '08:30'),
          },
        },
        {
          vendor_order_id: 'VO-1031-2',
          vendor_id: 'v_lumina',
          vendor_name: 'Lumina Lighting Co.',
          vendor_initials: 'LL',
          status: 'delivered',
          subtotal: 7200,
          item_ids: ['BI-1031-2'],
          delivery: {
            type: 'delivery',
            status: 'delivered',
            scheduled_window: 'Delivered at 09:45 AM',
            delivered_by: 'Lumina Express',
            delivery_proof_url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80',
            updated_at: relDate(0, '09:45'),
          },
        },
      ],
      items: [
        {
          item_id: 'BI-1031-1',
          equipment_id: 'eq_speaker_compact_02',
          name: 'Compact PA Speaker (Single)',
          image_url: '/images/equipment/line-array-speaker.svg',
          unit_price: 700,
          quantity: 4,
          days: 2,
          total_price: 5600,
          status: 'confirmed',
          vendor_id: 'v_sargam',
          vendor_name: 'Sargam Sound Systems',
          review: null,
          damage_report: null,
        },
        {
          item_id: 'BI-1031-2',
          equipment_id: 'eq_light_par_can_08',
          name: 'LED Par Can Lights (8-pack)',
          image_url: '/images/equipment/stage-lights.svg',
          unit_price: 1800,
          quantity: 2,
          days: 2,
          total_price: 7200,
          status: 'delivered',
          vendor_id: 'v_lumina',
          vendor_name: 'Lumina Lighting Co.',
          review: null,
          damage_report: null,
        },
      ],
      activity: [
        {
          id: 'ACT-1031-1',
          title: 'Booking Confirmed & Paid',
          description: 'Payment of ₹28,314 cleared via Card.',
          timestamp: relDate(-2, '09:05'),
          type: 'payment',
        },
        {
          id: 'ACT-1031-2',
          title: 'Stage lights delivered',
          description: 'Received by Aarav Mehta. Delivery proof recorded.',
          timestamp: relDate(0, '09:45'),
          type: 'delivery',
        },
        {
          id: 'ACT-1031-3',
          title: 'Speakers out for delivery',
          description: 'On vehicle KA-01-AB-1234.',
          timestamp: relDate(0, '10:00'),
          type: 'delivery',
        },
      ],
    },

    // 4. Completed, inspected, one item with a damage report in status reported plus one item awaiting review
    {
      booking_id: 'BK-1025',
      event_name: "Pooja's 25th Birthday Gala",
      event_type: 'Birthday',
      status: 'completed',
      payment_status: 'paid',
      start_date: b4_start,
      end_date: b4_end,
      rental_days: 1,
      delivery_city: 'Bengaluru',
      vendor_count: 1,
      item_count: 2,
      vendor_avatars: [
        { id: 'v_royalseat', name: 'RoyalSeat Furniture', initials: 'RF' },
      ],
      total_amount: 9086,
      action_needed: ['Respond to damage report', 'Review pending'],
      created_at: relDate(-8, '10:00'),
      delivery_address: { ...HOME_ADDRESS_SNAPSHOT },
      price_summary: {
        subtotal: 2700,
        discount: 0,
        tax: 486,
        delivery_fee: 500,
        security_deposit: 5400,
        total: 9086,
      },
      deposit: {
        held: 5400,
        deducted: 0,
        refunded: 0,
        pending_refund: 5400,
      },
      payments: [
        {
          payment_id: 'PAY-1025-1',
          booking_id: 'BK-1025',
          event_name: "Pooja's 25th Birthday Gala",
          type: 'full',
          method: 'netbanking',
          amount: 9086,
          status: 'success',
          created_at: relDate(-8, '10:05'),
          reference: 'TXN••••7721',
        },
      ],
      vendor_orders: [
        {
          vendor_order_id: 'VO-1025-1',
          vendor_id: 'v_royalseat',
          vendor_name: 'RoyalSeat Furniture',
          vendor_initials: 'RF',
          status: 'returned',
          subtotal: 2700,
          item_ids: ['BI-1025-1', 'BI-1025-2'],
          delivery: {
            type: 'delivery',
            status: 'delivered',
            scheduled_window: 'Delivered on time',
            updated_at: relDate(-5, '09:00'),
          },
          return: {
            status: 'returned',
            returned_at: relDate(-4, '11:00'),
            inspected_at: relDate(-4, '15:30'),
            condition: 'minor_damage',
            notes: 'Two banquet chairs had fabric scuff marks. Tables returned in good order.',
          },
        },
      ],
      items: [
        {
          item_id: 'BI-1025-1',
          equipment_id: 'eq_chair_banquet_10',
          name: 'Banquet Chair (Set of 50)',
          image_url: '/images/equipment/banquet-chairs.svg',
          unit_price: 1500,
          quantity: 1,
          days: 1,
          total_price: 1500,
          status: 'returned',
          vendor_id: 'v_royalseat',
          vendor_name: 'RoyalSeat Furniture',
          review: null,
          damage_report: {
            report_id: 'DR-1025-1',
            equipment_id: 'eq_chair_banquet_10',
            equipment_name: 'Banquet Chair (Set of 50)',
            description: 'Two chairs in the set arrived with torn velvet upholstery and minor leg scratching.',
            repair_cost: 800,
            deducted_from_deposit: 800,
            status: 'reported',
            filed_at: relDate(-4, '16:00'),
          },
        },
        {
          item_id: 'BI-1025-2',
          equipment_id: 'eq_table_round_11',
          name: 'Round Cocktail Table (Set of 10)',
          image_url: '/images/equipment/cocktail-tables.svg',
          unit_price: 1200,
          quantity: 1,
          days: 1,
          total_price: 1200,
          status: 'returned',
          vendor_id: 'v_royalseat',
          vendor_name: 'RoyalSeat Furniture',
          review: null,
          damage_report: null,
        },
      ],
      activity: [
        {
          id: 'ACT-1025-1',
          title: 'Equipment Returned',
          description: 'Picked up by RoyalSeat logistics.',
          timestamp: relDate(-4, '11:00'),
          type: 'return',
        },
        {
          id: 'ACT-1025-2',
          title: 'Inspection Completed',
          description: 'Vendor noted minor fabric wear on chairs.',
          timestamp: relDate(-4, '15:30'),
          type: 'inspection',
        },
        {
          id: 'ACT-1025-3',
          title: 'Damage Report Filed',
          description: '₹800 repair fee proposed from security deposit.',
          timestamp: relDate(-4, '16:00'),
          type: 'inspection',
        },
      ],
    },

    // 5. Completed, fully reviewed with a vendor reply, deposit fully refunded
    {
      booking_id: 'BK-1019',
      event_name: 'Rohan & Sneha Sangeet',
      event_type: 'Sangeet',
      status: 'completed',
      payment_status: 'paid',
      start_date: b5_start,
      end_date: b5_end,
      rental_days: 1,
      delivery_city: 'Bengaluru',
      vendor_count: 1,
      item_count: 1,
      vendor_avatars: [
        { id: 'v_sargam', name: 'Sargam Sound Systems', initials: 'SS' },
      ],
      total_amount: 8350,
      action_needed: [],
      created_at: relDate(-15, '12:00'),
      delivery_address: { ...HOME_ADDRESS_SNAPSHOT },
      price_summary: {
        subtotal: 2500,
        discount: 0,
        tax: 450,
        delivery_fee: 400,
        security_deposit: 5000,
        total: 8350,
      },
      deposit: {
        held: 5000,
        deducted: 0,
        refunded: 5000,
        pending_refund: 0,
      },
      payments: [
        {
          payment_id: 'PAY-1019-1',
          booking_id: 'BK-1019',
          event_name: 'Rohan & Sneha Sangeet',
          type: 'full',
          method: 'upi',
          amount: 8350,
          status: 'success',
          created_at: relDate(-15, '12:05'),
          reference: 'TXN••••6612',
        },
        {
          payment_id: 'PAY-1019-2',
          booking_id: 'BK-1019',
          event_name: 'Rohan & Sneha Sangeet',
          type: 'deposit_refund',
          method: 'upi',
          amount: 5000,
          status: 'refunded',
          created_at: relDate(-11, '10:00'),
          reference: 'TXN••••6612',
          refund_reference: 'REF-99214',
        },
      ],
      vendor_orders: [
        {
          vendor_order_id: 'VO-1019-1',
          vendor_id: 'v_sargam',
          vendor_name: 'Sargam Sound Systems',
          vendor_initials: 'SS',
          status: 'completed',
          subtotal: 2500,
          item_ids: ['BI-1019-1'],
          delivery: {
            type: 'delivery',
            status: 'delivered',
            scheduled_window: 'Delivered at 10:30 AM',
            updated_at: relDate(-12, '10:30'),
          },
          return: {
            status: 'returned',
            returned_at: relDate(-11, '09:00'),
            inspected_at: relDate(-11, '09:30'),
            condition: 'good',
            notes: 'Returned in pristine factory condition.',
          },
        },
      ],
      items: [
        {
          item_id: 'BI-1019-1',
          equipment_id: 'eq_speaker_pair_01',
          name: 'Pro Line-Array Speaker Pair',
          image_url: '/images/equipment/line-array-speaker.svg',
          unit_price: 2500,
          quantity: 1,
          days: 1,
          total_price: 2500,
          status: 'returned',
          vendor_id: 'v_sargam',
          vendor_name: 'Sargam Sound Systems',
          review: {
            review_id: 'REV-1019-1',
            booking_id: 'BK-1019',
            equipment_id: 'eq_speaker_pair_01',
            equipment_name: 'Pro Line-Array Speaker Pair',
            rating: 5,
            comment: 'The sound clarity was remarkable for our 200-guest sangeet. The crew arrived early and set up neatly.',
            vendor_reply: 'Thank you Aarav! It was an absolute delight supporting your family celebration.',
            created_at: relDate(-10, '14:20'),
          },
          damage_report: null,
        },
      ],
      activity: [
        {
          id: 'ACT-1019-1',
          title: 'Return Inspection Passed',
          description: 'No damage detected.',
          timestamp: relDate(-11, '09:30'),
          type: 'inspection',
        },
        {
          id: 'ACT-1019-2',
          title: 'Security Deposit Refunded',
          description: '₹5,000 returned to UPI.',
          timestamp: relDate(-11, '10:00'),
          type: 'payment',
        },
        {
          id: 'ACT-1019-3',
          title: 'Customer Review Submitted',
          description: '5-star rating given.',
          timestamp: relDate(-10, '14:20'),
          type: 'system',
        },
      ],
    },

    // 6. Completed with a disputed damage report
    {
      booking_id: 'BK-1012',
      event_name: 'Autumn Rooftop Acoustic Night',
      event_type: 'Social',
      status: 'completed',
      payment_status: 'paid',
      start_date: b6_start,
      end_date: b6_end,
      rental_days: 2,
      delivery_city: 'Bengaluru',
      vendor_count: 1,
      item_count: 2,
      vendor_avatars: [
        { id: 'v_lumina', name: 'Lumina Lighting Co.', initials: 'LL' },
      ],
      total_amount: 5632,
      action_needed: [],
      created_at: relDate(-22, '18:00'),
      delivery_address: { ...HOME_ADDRESS_SNAPSHOT },
      price_summary: {
        subtotal: 2400,
        discount: 0,
        tax: 432,
        delivery_fee: 400,
        security_deposit: 2400,
        total: 5632,
      },
      deposit: {
        held: 2400,
        deducted: 0,
        refunded: 0,
        pending_refund: 2400,
      },
      payments: [
        {
          payment_id: 'PAY-1012-1',
          booking_id: 'BK-1012',
          event_name: 'Autumn Rooftop Acoustic Night',
          type: 'full',
          method: 'upi',
          amount: 5632,
          status: 'success',
          created_at: relDate(-22, '18:05'),
          reference: 'TXN••••5501',
        },
      ],
      vendor_orders: [
        {
          vendor_order_id: 'VO-1012-1',
          vendor_id: 'v_lumina',
          vendor_name: 'Lumina Lighting Co.',
          vendor_initials: 'LL',
          status: 'completed',
          subtotal: 2400,
          item_ids: ['BI-1012-1'],
          delivery: {
            type: 'delivery',
            status: 'delivered',
            scheduled_window: 'Delivered as requested',
            updated_at: relDate(-20, '14:00'),
          },
          return: {
            status: 'returned',
            returned_at: relDate(-18, '10:00'),
            inspected_at: relDate(-18, '11:00'),
            condition: 'minor_damage',
            notes: 'Vendor flagged missing cable adapter.',
          },
        },
      ],
      items: [
        {
          item_id: 'BI-1012-1',
          equipment_id: 'eq_light_fairy_09',
          name: 'Warm White Fairy Light Curtain',
          image_url: '/images/equipment/fairy-lights.svg',
          unit_price: 600,
          quantity: 2,
          days: 2,
          total_price: 2400,
          status: 'returned',
          vendor_id: 'v_lumina',
          vendor_name: 'Lumina Lighting Co.',
          review: null,
          damage_report: {
            report_id: 'DR-1012-1',
            equipment_id: 'eq_light_fairy_09',
            equipment_name: 'Warm White Fairy Light Curtain',
            description: 'Vendor claimed 24V adapter was missing from returning crate.',
            repair_cost: 600,
            deducted_from_deposit: 600,
            status: 'disputed',
            dispute_reason: 'The adapter was packed in the velvet accessory pouch inside the main flight box. We have photographic evidence from the return handover.',
            filed_at: relDate(-18, '11:30'),
          },
        },
      ],
      activity: [
        {
          id: 'ACT-1012-1',
          title: 'Damage Claim Filed by Vendor',
          description: '₹600 claim submitted.',
          timestamp: relDate(-18, '11:30'),
          type: 'inspection',
        },
        {
          id: 'ACT-1012-2',
          title: 'Dispute Raised by Customer',
          description: 'Your dispute is under review by our team.',
          timestamp: relDate(-17, '09:15'),
          type: 'inspection',
        },
      ],
    },

    // 7. Cancelled
    {
      booking_id: 'BK-1004',
      event_name: 'Garden Engagement Ceremony',
      event_type: 'Engagement',
      status: 'cancelled',
      payment_status: 'refunded',
      start_date: b7_start,
      end_date: b7_end,
      rental_days: 2,
      delivery_city: 'Jaipur',
      vendor_count: 1,
      item_count: 1,
      vendor_avatars: [
        { id: 'v_shamiyana', name: 'Shamiyana Tents & Decor', initials: 'ST' },
      ],
      total_amount: 10192,
      action_needed: [],
      created_at: relDate(-36, '15:00'),
      delivery_address: {
        name: 'Aarav Mehta',
        line1: 'Rambagh Road',
        line2: 'Near Polo Ground',
        city: 'Jaipur',
        state: 'Rajasthan',
        pincode: '302005',
        country: 'India',
      },
      price_summary: {
        subtotal: 4400,
        discount: 0,
        tax: 792,
        delivery_fee: 600,
        security_deposit: 4400,
        total: 10192,
      },
      deposit: {
        held: 4400,
        deducted: 0,
        refunded: 4400,
        pending_refund: 0,
      },
      payments: [
        {
          payment_id: 'PAY-1004-1',
          booking_id: 'BK-1004',
          event_name: 'Garden Engagement Ceremony',
          type: 'full',
          method: 'card',
          amount: 10192,
          status: 'refunded',
          created_at: relDate(-36, '15:10'),
          reference: 'TXN••••1004',
          refund_reference: 'REF-44021',
        },
      ],
      vendor_orders: [
        {
          vendor_order_id: 'VO-1004-1',
          vendor_id: 'v_shamiyana',
          vendor_name: 'Shamiyana Tents & Decor',
          vendor_initials: 'ST',
          status: 'cancelled',
          subtotal: 4400,
          item_ids: ['BI-1004-1'],
        },
      ],
      items: [
        {
          item_id: 'BI-1004-1',
          equipment_id: 'eq_tent_pagoda_12',
          name: '10x10 Pagoda Tent',
          image_url: '/images/equipment/pagoda-tent.svg',
          unit_price: 2200,
          quantity: 1,
          days: 2,
          total_price: 4400,
          status: 'cancelled',
          vendor_id: 'v_shamiyana',
          vendor_name: 'Shamiyana Tents & Decor',
          review: null,
          damage_report: null,
        },
      ],
      activity: [
        {
          id: 'ACT-1004-1',
          title: 'Booking Placed',
          description: 'Payment authorized.',
          timestamp: relDate(-36, '15:10'),
          type: 'order',
        },
        {
          id: 'ACT-1004-2',
          title: 'Booking Cancelled by Customer',
          description: 'Event rescheduled due to venue change.',
          timestamp: relDate(-35, '18:00'),
          type: 'order',
        },
        {
          id: 'ACT-1004-3',
          title: 'Refund Processed',
          description: '₹10,192 refunded to original card.',
          timestamp: relDate(-34, '11:00'),
          type: 'payment',
        },
      ],
    },
  ]

  const conversations: Conversation[] = [
    {
      conversation_id: 'conv_sargam_speakers',
      vendor_id: 'v_sargam',
      vendor_name: 'Sargam Sound Systems',
      vendor_initials: 'SS',
      equipment_id: 'eq_speaker_pair_01',
      equipment_name: 'Pro Line-Array Speaker Pair',
      equipment_image: '/images/equipment/line-array-speaker.svg',
      last_message: 'Please ensure power outlets are accessible on the stage.',
      last_message_time: relDate(0, '10:42'),
      unread_count: 2,
    },
    {
      conversation_id: 'conv_lumina_lights',
      vendor_id: 'v_lumina',
      vendor_name: 'Lumina Lighting Co.',
      vendor_initials: 'LL',
      equipment_id: 'eq_light_moving_head_07',
      equipment_name: 'Moving Head Light (Pair)',
      equipment_image: '/images/equipment/stage-lights.svg',
      last_message: 'Great, that saves us from renting cables separately!',
      last_message_time: relDate(-1, '16:15'),
      unread_count: 0,
    },
    {
      conversation_id: 'conv_royalseat_chairs',
      vendor_id: 'v_royalseat',
      vendor_name: 'RoyalSeat Furniture',
      vendor_initials: 'RF',
      equipment_id: 'eq_chair_banquet_10',
      equipment_name: 'Banquet Chair (Set of 50)',
      equipment_image: '/images/equipment/banquet-chairs.svg',
      last_message: 'Confirmed, the venue manager is briefed.',
      last_message_time: relDate(-4, '10:30'),
      unread_count: 0,
    },
    {
      conversation_id: 'conv_sargam_dj',
      vendor_id: 'v_sargam',
      vendor_name: 'Sargam Sound Systems',
      vendor_initials: 'SS',
      equipment_id: 'eq_dj_controller_06',
      equipment_name: 'DJ Controller + Mixer Setup',
      equipment_image: '/images/equipment/dj-mixer.svg',
      last_message: 'It operates in hardware performance mode with Rekordbox 6.',
      last_message_time: relDate(-3, '14:20'),
      unread_count: 0,
    },
    {
      conversation_id: 'conv_shamiyana_tent',
      vendor_id: 'v_shamiyana',
      vendor_name: 'Shamiyana Tents & Decor',
      vendor_initials: 'ST',
      equipment_id: 'eq_tent_pagoda_12',
      equipment_name: '10x10 Pagoda Tent',
      equipment_image: '/images/equipment/pagoda-tent.svg',
      last_message: 'We provide 25kg sandbag weights for tiled/hard surfaces.',
      last_message_time: relDate(-35, '16:00'),
      unread_count: 0,
    },
  ]

  const messages: Message[] = [
    // Thread 1: Sargam (Speakers)
    {
      message_id: 'msg_sargam_1',
      conversation_id: 'conv_sargam_speakers',
      sender: 'customer',
      text: 'Hi, can you deliver by 9 AM on the event morning?',
      created_at: relDate(0, '10:30'),
      status: 'seen',
    },
    {
      message_id: 'msg_sargam_2',
      conversation_id: 'conv_sargam_speakers',
      sender: 'vendor',
      text: 'Hello Aarav! Yes, our van will arrive between 9:00 AM and 9:30 AM.',
      created_at: relDate(0, '10:38'),
      status: 'sent',
    },
    {
      message_id: 'msg_sargam_3',
      conversation_id: 'conv_sargam_speakers',
      sender: 'vendor',
      text: 'Please ensure power outlets are accessible on the stage.',
      created_at: relDate(0, '10:42'),
      status: 'sent',
    },

    // Thread 2: Lumina (Moving Head Lights)
    {
      message_id: 'msg_lumina_1',
      conversation_id: 'conv_lumina_lights',
      sender: 'customer',
      text: 'Do these moving head lights come with DMX control cables?',
      created_at: relDate(-1, '15:45'),
      status: 'seen',
    },
    {
      message_id: 'msg_lumina_2',
      conversation_id: 'conv_lumina_lights',
      sender: 'vendor',
      text: 'Yes, 10-meter DMX cables and clamps are included in the flight case.',
      created_at: relDate(-1, '16:05'),
      status: 'seen',
    },
    {
      message_id: 'msg_lumina_3',
      conversation_id: 'conv_lumina_lights',
      sender: 'customer',
      text: 'Great, that saves us from renting cables separately!',
      created_at: relDate(-1, '16:15'),
      status: 'sent',
    },

    // Thread 3: RoyalSeat
    {
      message_id: 'msg_rf_1',
      conversation_id: 'conv_royalseat_chairs',
      sender: 'vendor',
      text: 'Pickup is scheduled for tomorrow at 10 AM.',
      created_at: relDate(-4, '10:15'),
      status: 'seen',
    },
    {
      message_id: 'msg_rf_2',
      conversation_id: 'conv_royalseat_chairs',
      sender: 'customer',
      text: 'Confirmed, the venue manager is briefed.',
      created_at: relDate(-4, '10:30'),
      status: 'seen',
    },

    // Thread 4: Sargam DJ
    {
      message_id: 'msg_dj_1',
      conversation_id: 'conv_sargam_dj',
      sender: 'customer',
      text: 'Is Rekordbox license included with the DJ controller?',
      created_at: relDate(-3, '14:00'),
      status: 'seen',
    },
    {
      message_id: 'msg_dj_2',
      conversation_id: 'conv_sargam_dj',
      sender: 'vendor',
      text: 'It operates in hardware performance mode with Rekordbox 6.',
      created_at: relDate(-3, '14:20'),
      status: 'seen',
    },

    // Thread 5: Shamiyana
    {
      message_id: 'msg_tent_1',
      conversation_id: 'conv_shamiyana_tent',
      sender: 'customer',
      text: 'Does setup require drilling pegs into the ground or weights?',
      created_at: relDate(-35, '15:30'),
      status: 'seen',
    },
    {
      message_id: 'msg_tent_2',
      conversation_id: 'conv_shamiyana_tent',
      sender: 'vendor',
      text: 'We provide 25kg sandbag weights for tiled/hard surfaces.',
      created_at: relDate(-35, '16:00'),
      status: 'seen',
    },
  ]

  const notifications: AppNotification[] = [
    // 6 Unread
    {
      id: 'notif_1',
      type: 'booking_confirmed',
      title: 'Booking Confirmed',
      message: 'Your booking BK-1038 for Annual Tech Symposium has been confirmed.',
      created_at: relDate(0, '09:00'),
      read: false,
      target: { tab: 'bookings', booking_id: 'BK-1038' },
    },
    {
      id: 'notif_2',
      type: 'order_accepted',
      title: 'Vendor Accepted Order',
      message: 'Sargam Sound Systems confirmed your items for booking BK-1042.',
      created_at: relDate(0, '08:45'),
      read: false,
      target: { tab: 'bookings', booking_id: 'BK-1042' },
    },
    {
      id: 'notif_3',
      type: 'order_rejected',
      title: 'Vendor Declined Item',
      message: 'Lumina Lighting Co. could not confirm Moving Head Light (Pair) due to maintenance.',
      created_at: relDate(0, '08:30'),
      read: false,
      target: { tab: 'bookings', booking_id: 'BK-1042' },
    },
    {
      id: 'notif_4',
      type: 'order_dispatched',
      title: 'Equipment Dispatched',
      message: 'Driver Ramesh Kumar is on the way with your speakers for BK-1031.',
      created_at: relDate(0, '08:00'),
      read: false,
      target: { tab: 'bookings', booking_id: 'BK-1031' },
    },
    {
      id: 'notif_5',
      type: 'delivered',
      title: 'Equipment Delivered',
      message: 'LED Par Can Lights were delivered to your venue for BK-1031.',
      created_at: relDate(0, '07:45'),
      read: false,
      target: { tab: 'bookings', booking_id: 'BK-1031' },
    },
    {
      id: 'notif_6',
      type: 'message_received',
      title: 'New Message from Sargam Sound Systems',
      message: 'Please ensure power outlets are accessible on the stage.',
      created_at: relDate(0, '10:42'),
      read: false,
      target: { tab: 'inbox', thread_id: 'conv_sargam_speakers' },
    },

    // 12 Read
    {
      id: 'notif_7',
      type: 'return_scheduled',
      title: 'Return Pickup Scheduled',
      message: 'RoyalSeat Furniture scheduled return pickup for booking BK-1025.',
      created_at: relDate(-4, '09:00'),
      read: true,
      target: { tab: 'bookings', booking_id: 'BK-1025' },
    },
    {
      id: 'notif_8',
      type: 'return_inspected',
      title: 'Return Inspection Completed',
      message: 'Inspection completed for booking BK-1025. Minor scuff marks noted.',
      created_at: relDate(-4, '15:30'),
      read: true,
      target: { tab: 'bookings', booking_id: 'BK-1025' },
    },
    {
      id: 'notif_9',
      type: 'damage_report_filed',
      title: 'Damage Report Filed',
      message: 'RoyalSeat Furniture filed a ₹800 repair claim for booking BK-1025.',
      created_at: relDate(-4, '16:00'),
      read: true,
      target: { tab: 'bookings', booking_id: 'BK-1025' },
    },
    {
      id: 'notif_10',
      type: 'payment_received',
      title: 'Advance Payment Received',
      message: 'We received your advance payment of ₹8,000 for booking BK-1038.',
      created_at: relDate(-3, '11:20'),
      read: true,
      target: { tab: 'bookings', booking_id: 'BK-1038' },
    },
    {
      id: 'notif_11',
      type: 'refund_processed',
      title: 'Full Refund Processed',
      message: 'Refund of ₹10,192 processed for cancelled booking BK-1004.',
      created_at: relDate(-34, '11:00'),
      read: true,
      target: { tab: 'bookings', booking_id: 'BK-1004' },
    },
    {
      id: 'notif_12',
      type: 'review_reminder',
      title: 'Review Your Rental',
      message: 'How was your Round Cocktail Table from RoyalSeat Furniture? Leave a review.',
      created_at: relDate(-3, '12:00'),
      read: true,
      target: { tab: 'reviews' },
    },
    {
      id: 'notif_13',
      type: 'booking_confirmed',
      title: 'Booking Confirmed',
      message: 'Booking BK-1031 for Bangalore Indie Music Fest was confirmed.',
      created_at: relDate(-2, '09:05'),
      read: true,
      target: { tab: 'bookings', booking_id: 'BK-1031' },
    },
    {
      id: 'notif_14',
      type: 'order_accepted',
      title: 'Vendor Accepted Order',
      message: 'Lumina Lighting Co. accepted order VO-1031-2.',
      created_at: relDate(-2, '10:00'),
      read: true,
      target: { tab: 'bookings', booking_id: 'BK-1031' },
    },
    {
      id: 'notif_15',
      type: 'delivered',
      title: 'Equipment Delivered',
      message: 'Speaker setup delivered for Rohan & Sneha Sangeet.',
      created_at: relDate(-12, '10:30'),
      read: true,
      target: { tab: 'bookings', booking_id: 'BK-1019' },
    },
    {
      id: 'notif_16',
      type: 'refund_processed',
      title: 'Security Deposit Refunded',
      message: '₹5,000 security deposit refunded for booking BK-1019.',
      created_at: relDate(-11, '10:00'),
      read: true,
      target: { tab: 'bookings', booking_id: 'BK-1019' },
    },
    {
      id: 'notif_17',
      type: 'payment_received',
      title: 'Booking Invoice Created',
      message: 'Invoice created for booking BK-1042.',
      created_at: relDate(-1, '14:30'),
      read: true,
      target: { tab: 'bookings', booking_id: 'BK-1042' },
    },
    {
      id: 'notif_18',
      type: 'message_received',
      title: 'Message from Lumina Lighting Co.',
      message: '10-meter DMX cables and clamps are included in the flight case.',
      created_at: relDate(-1, '16:05'),
      read: true,
      target: { tab: 'inbox', thread_id: 'conv_lumina_lights' },
    },
  ]

  const addresses: Address[] = [
    {
      id: 'addr_home',
      label: 'Home',
      name: 'Aarav Mehta',
      line1: '24 Residency Road',
      line2: 'Near Trinity Metro Station',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      country: 'India',
      is_default: true,
      used_in_bookings: 5,
      created_at: relDate(-60),
    },
    {
      id: 'addr_office',
      label: 'Office',
      name: 'Aarav Mehta',
      line1: 'Prestige Tech Park, Block C, 4th Floor',
      line2: 'Marathahalli-Sarjapur Outer Ring Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560103',
      country: 'India',
      is_default: false,
      used_in_bookings: 2,
      created_at: relDate(-45),
    },
    {
      id: 'addr_venue',
      label: 'Venue',
      name: 'Aarav Mehta',
      line1: 'Grand Ballroom, Palace Grounds',
      line2: 'Jayamahal Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560006',
      country: 'India',
      is_default: false,
      used_in_bookings: 0,
      created_at: relDate(-20),
    },
  ]

  const wishlistIds = [
    'eq_speaker_pair_01',
    'eq_light_moving_head_07',
    'eq_chair_banquet_10',
    'eq_tent_pagoda_12',
  ]

  return {
    version: STORE_VERSION,
    bookings,
    conversations,
    messages,
    notifications,
    addresses,
    wishlistIds,
  }
}

// Invariant Validation Suite
export function runDevInvariantChecks(state: AccountStoreState): void {
  if (import.meta.env.PROD) return

  // 1. Booking Arithmetic Invariants
  for (const b of state.bookings) {
    let computedSubtotal = 0
    for (const vo of b.vendor_orders) {
      computedSubtotal += vo.subtotal
    }

    let itemsSum = 0
    for (const item of b.items) {
      const lineTotal = item.unit_price * item.quantity * item.days
      if (lineTotal !== item.total_price) {
        console.error(
          `[Invariant Violation] Booking ${b.booking_id} item ${item.item_id}: line total ${item.total_price} != ${lineTotal}`
        )
      }
      if (item.status !== 'cancelled') {
        itemsSum += item.total_price
      }
    }

    if (itemsSum !== computedSubtotal) {
      console.error(
        `[Invariant Violation] Booking ${b.booking_id}: items sum (${itemsSum}) != vendor orders sum (${computedSubtotal})`
      )
    }

    if (b.price_summary.subtotal !== computedSubtotal) {
      console.error(
        `[Invariant Violation] Booking ${b.booking_id}: price_summary.subtotal (${b.price_summary.subtotal}) != vendor orders sum (${computedSubtotal})`
      )
    }

    const expectedTotal =
      b.price_summary.subtotal -
      b.price_summary.discount +
      b.price_summary.tax +
      b.price_summary.delivery_fee +
      b.price_summary.security_deposit

    if (b.price_summary.total !== expectedTotal) {
      console.error(
        `[Invariant Violation] Booking ${b.booking_id}: total (${b.price_summary.total}) != formula (${expectedTotal})`
      )
    }

    if (b.total_amount !== b.price_summary.total) {
      console.error(
        `[Invariant Violation] Booking ${b.booking_id}: total_amount (${b.total_amount}) != price_summary.total (${b.price_summary.total})`
      )
    }

    if (b.deposit.held !== b.price_summary.security_deposit) {
      console.error(
        `[Invariant Violation] Booking ${b.booking_id}: deposit.held (${b.deposit.held}) != security_deposit (${b.price_summary.security_deposit})`
      )
    }
  }

  // 2. Exactly one default address
  const defaults = state.addresses.filter((a) => a.is_default)
  if (defaults.length !== 1 && state.addresses.length > 0) {
    console.error(
      `[Invariant Violation] Default addresses count is ${defaults.length}, expected 1.`
    )
  }

  // 3. Unread counts consistency
  const unreadNotifs = state.notifications.filter((n) => !n.read).length
  const totalThreadUnread = state.conversations.reduce((acc, c) => acc + c.unread_count, 0)
  if (unreadNotifs < 0 || totalThreadUnread < 0) {
    console.error(`[Invariant Violation] Negative unread counts found.`)
  }
}

// Storage helpers
export function loadAccountState(): AccountStoreState {
  if (typeof window === 'undefined') {
    return createInitialAccountState()
  }

  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) {
      const initial = createInitialAccountState()
      saveAccountState(initial)
      runDevInvariantChecks(initial)
      return initial
    }

    const parsed = JSON.parse(raw) as AccountStoreState
    if (parsed.version !== STORE_VERSION) {
      const fresh = createInitialAccountState()
      saveAccountState(fresh)
      runDevInvariantChecks(fresh)
      return fresh
    }

    runDevInvariantChecks(parsed)
    return parsed
  } catch (err) {
    console.warn('Failed to parse account store, resetting to initial', err)
    const fresh = createInitialAccountState()
    saveAccountState(fresh)
    return fresh
  }
}

export function saveAccountState(state: AccountStoreState): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state))
    // Dispatch custom event for reactive multi-tab and multi-component synchronization
    window.dispatchEvent(new CustomEvent('r4f-account-store-updated', { detail: state }))
  } catch (err) {
    console.error('Failed to save account store to localStorage', err)
  }
}
