import TicketService from '../src/pairtest/TicketService.js';
import TicketTypeRequest from '../src/pairtest/lib/TicketTypeRequest.js';
import InvalidPurchaseException from '../src/pairtest/lib/InvalidPurchaseException.js';

// Mock the external services
jest.mock('../src/thirdparty/paymentgateway/TicketPaymentService.js');
jest.mock('../src/thirdparty/seatbooking/SeatReservationService.js');

describe('TicketService', () => {
  let ticketService;
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    ticketService = new TicketService();
  });

  describe('purchaseTickets', () => {
    it('should successfully purchase valid ticket combinations', () => {
      const accountId = 1;
      const adultRequest = new TicketTypeRequest('ADULT', 2);
      const childRequest = new TicketTypeRequest('CHILD', 1);
      const infantRequest = new TicketTypeRequest('INFANT', 1);

      const result = ticketService.purchaseTickets(accountId, adultRequest, childRequest, infantRequest);

      // Verify the result
      expect(result).toEqual({
        totalAmount: 65, // (2 * £25) + (1 * £15) + (1 * £0)
        totalSeats: 3,   // 2 adults + 1 child (infant doesn't need a seat)
        ticketCounts: {
          ADULT: 2,
          CHILD: 1,
          INFANT: 1
        }
      });

      // Verify external service calls
      expect(ticketService.paymentService.makePayment).toHaveBeenCalledWith(accountId, 65);
      expect(ticketService.seatService.reserveSeat).toHaveBeenCalledWith(accountId, 3);
    });

    it('should throw error for invalid account ID', () => {
      const invalidAccountId = 0;
      const adultRequest = new TicketTypeRequest('ADULT', 1);

      expect(() => {
        ticketService.purchaseTickets(invalidAccountId, adultRequest);
      }).toThrow(InvalidPurchaseException);
    });

    it('should throw error when no tickets are requested', () => {
      expect(() => {
        ticketService.purchaseTickets(1);
      }).toThrow(InvalidPurchaseException);
    });

    it('should throw error when exceeding maximum ticket limit', () => {
      const accountId = 1;
      const adultRequest = new TicketTypeRequest('ADULT', 26);

      expect(() => {
        ticketService.purchaseTickets(accountId, adultRequest);
      }).toThrow(InvalidPurchaseException);
    });

    it('should throw error when purchasing child tickets without adult', () => {
      const accountId = 1;
      const childRequest = new TicketTypeRequest('CHILD', 1);

      expect(() => {
        ticketService.purchaseTickets(accountId, childRequest);
      }).toThrow(InvalidPurchaseException);
    });

    it('should throw error when purchasing infant tickets without adult', () => {
      const accountId = 1;
      const infantRequest = new TicketTypeRequest('INFANT', 1);

      expect(() => {
        ticketService.purchaseTickets(accountId, infantRequest);
      }).toThrow(InvalidPurchaseException);
    });

    it('should handle multiple ticket requests of the same type', () => {
      const accountId = 1;
      const adultRequest1 = new TicketTypeRequest('ADULT', 2);
      const adultRequest2 = new TicketTypeRequest('ADULT', 1);

      const result = ticketService.purchaseTickets(accountId, adultRequest1, adultRequest2);

      expect(result.ticketCounts.ADULT).toBe(3);
      expect(result.totalAmount).toBe(75); // 3 * £25
      expect(result.totalSeats).toBe(3);
    });
  });

  describe('calculateTotalAmount', () => {
    it('should calculate correct total amount for different ticket combinations', () => {
      const ticketCounts = {
        ADULT: 2,
        CHILD: 3,
        INFANT: 1
      };

      const total = ticketService.calculateTotalAmount(ticketCounts);
      expect(total).toBe(95); // (2 * £25) + (3 * £15) + (1 * £0)
    });
  });
}); 