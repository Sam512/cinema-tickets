import TicketTypeRequest from './lib/TicketTypeRequest.js';
import InvalidPurchaseException from './lib/InvalidPurchaseException.js';
import TicketPaymentService from '../thirdparty/paymentgateway/TicketPaymentService.js';
import SeatReservationService from '../thirdparty/seatbooking/SeatReservationService.js';

export default class TicketService {
  constructor() {
    this.paymentService = new TicketPaymentService();
    this.seatService = new SeatReservationService();
  }

  // Constants for ticket prices and rules
  static TICKET_PRICES = {
    ADULT: 25,
    CHILD: 15,
    INFANT: 0
  };

  static MAX_TICKETS = 25;

  /**
   * Should only have private methods other than the one below.
   */

  purchaseTickets(accountId, ...ticketTypeRequests) {
    // Validate account ID
    if (!accountId || accountId <= 0) {
      throw new InvalidPurchaseException('Invalid account ID');
    }

    // Validate ticket requests
    if (!ticketTypeRequests || ticketTypeRequests.length === 0) {
      throw new InvalidPurchaseException('No tickets requested');
    }

    // Count tickets by type
    const ticketCounts = {
      ADULT: 0,
      CHILD: 0,
      INFANT: 0
    };

    // Calculate totals and validate requests
    ticketTypeRequests.forEach(request => {
      if (!(request instanceof TicketTypeRequest)) {
        throw new InvalidPurchaseException('Invalid ticket request');
      }
      ticketCounts[request.getTicketType()] += request.getNoOfTickets();
    });

    // Validate business logic
    this.validatePurchaseRules(ticketCounts);

    // Calculate total amount and seats needed
    const totalAmount = this.calculateTotalAmount(ticketCounts);
    const totalSeats = this.calculateTotalSeats(ticketCounts);

    // Make payment and reserve seats
    this.paymentService.makePayment(accountId, totalAmount);
    this.seatService.reserveSeat(accountId, totalSeats);

    return {
      totalAmount,
      totalSeats,
      ticketCounts
    };
  }

  calculateTotalAmount(ticketCounts) {
    return Object.entries(ticketCounts).reduce((total, [type, count]) => {
      return total + (TicketService.TICKET_PRICES[type] * count);
    }, 0);
  }

  calculateTotalSeats(ticketCounts) {
    // Infants don't need seats
    return ticketCounts.ADULT + ticketCounts.CHILD;
  }

  validatePurchaseRules(ticketCounts) {
    const totalTickets = Object.values(ticketCounts).reduce((sum, count) => sum + count, 0);
    
    if (totalTickets > TicketService.MAX_TICKETS) {
      throw new InvalidPurchaseException('Maximum 25 tickets per purchase');
    }

    if (ticketCounts.ADULT === 0 && (ticketCounts.CHILD > 0 || ticketCounts.INFANT > 0)) {
      throw new InvalidPurchaseException('Child and infant tickets require at least one adult ticket');
    }
  }
}
