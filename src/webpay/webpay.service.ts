import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WebpayPlus, Options, Environment } from 'transbank-sdk';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { RefundTransactionDto } from './dto/refund-transaction.dto';
import { Transaction, TransactionDocument } from './entities/webpay.entity';
import { CustomLogger } from 'src/shared/utils/logger.util';

@Injectable()
export class WebpayService {
  private webpay: InstanceType<typeof WebpayPlus.Transaction>;
  private readonly logger = new CustomLogger(WebpayService.name);

  constructor(
    private configService: ConfigService,
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
  ) {
    const commerceCode = this.configService.get<string>('webpay.commerceCode');
    const apiKey = this.configService.get<string>('webpay.apiKey');
    const environment = this.configService.get<string>('webpay.environment') === 'LIVE' 
      ? Environment.Production 
      : Environment.Integration;

    const options: Options = new Options(commerceCode, apiKey, environment);
    this.webpay = new WebpayPlus.Transaction(options);
  }

  async createTransaction(createTransactionDto: CreateTransactionDto, trackingId: string): Promise<any> {
    try {
      this.logger.log(`createTransactionDto: ${JSON.stringify(createTransactionDto)}`, WebpayService.name, "createTransaction",trackingId);

      const { amount, buyOrder, returnUrl, sessionId } = createTransactionDto;

      const result = await this.webpay.create(buyOrder, sessionId, amount, returnUrl);
      
      // Guardar la transacciÃ³n en MongoDB
      const newTransaction = new this.transactionModel({
        token: result.token,
        amount,
        buyOrder,
        sessionId,
        status: 'INITIALIZED',
      });
      await newTransaction.save();

      this.logger.log(`Transaction created: ${JSON.stringify(result)}`, WebpayService.name, "createTransaction", trackingId);
      return result;
    } catch (error) {
      this.logger.error(`Error creating transaction: ${error.message}`, error.stack, WebpayService.name, "createTransaction", trackingId);
      throw new InternalServerErrorException('Error creating Webpay transaction');
    }
  }

  async commitTransaction(token: string, trackingId:string): Promise<any> {
    this.logger.log(`inicio de la transacciÃ³n : ${token}`, WebpayService.name, "commitTransaction",trackingId);
    
    try {
      const result = await this.webpay.commit(token);
      this.logger.log(`Resultado de la transacciÃ³n: ${JSON.stringify(result)}`, WebpayService.name, "commitTransaction", trackingId);

      const mappedTransaction = this.mapTransbankResponseToTransaction(result);
      
      // Actualizar la transacciÃ³n en MongoDB
      const transation = await this.transactionModel.findOneAndUpdate(
        { token },
        mappedTransaction,
        { new: true }
      );

      if (transation) {
        const transactionId = transation._id.toString();
        this.logger.log(`Trasacion actualizada con ID: ${transactionId}`, WebpayService.name, "commitTransaction", trackingId);
        
        return {
          ...mappedTransaction,
          id: transactionId
        };
      } else {
        this.logger.log(`Transaction no encontrada`,WebpayService.name, "commitTransaction", trackingId);
        throw new Error('Transaction not found');
      }
    } catch (error) {
      this.logger.error(`Error committing Webpay transaction: ${error.message}`, error.stack, WebpayService.name, "commitTransaction");
      throw new InternalServerErrorException('Error committing Webpay transaction', trackingId);
    }
  }


   mapTransbankResponseToTransaction(response: any): Partial<Transaction> {
    return {
      amount: response.amount,
      status: response.status,
      buyOrder: response.buy_order,
      sessionId: response.session_id,
      transactionDate: new Date(response.transaction_date),
      paymentTypeCode: response.payment_type_code,
      authorizationCode: response.authorization_code,
      responseCode: response.response_code,
      vci: response.vci,
      cardNumber: response.card_detail?.card_number,
      accountingDate: response.accounting_date,
      installmentsNumber: response.installments_number,
    };
  }
  
  async refundTransaction(refundTransactionDto: RefundTransactionDto, trackingId:string): Promise<any> {
    try {
      this.logger.log(`inciando reembolso de transacciÃ³n`, WebpayService.name, "refundTransaction", trackingId);

      const { token, amount } = refundTransactionDto;
      const result = await this.webpay.refund(token, amount);
      
      // Actualizar la transacciÃ³n en MongoDB
      await this.transactionModel.findOneAndUpdate(
        { token },
        { status: 'REFUNDED' }
      );

      this.logger.log(`Transaction refunded: ${JSON.stringify(result)}`, WebpayService.name, "mapTransbankResponseToTransaction", trackingId);
      return result;
    } catch (error) {
      this.logger.error(`Error refunding transaction: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error refunding Webpay transaction', trackingId);
    }
  }

  async getTransactionStatus(token: string, trackingId : string): Promise<any> {
    try {
      this.logger.log(`Obteniendo estado de transacciÃ³n`, WebpayService.name, "getTransactionStatus", trackingId);
      const result = await this.webpay.status(token);
      this.logger.log(`Transaction status: ${JSON.stringify(result)}`,WebpayService.name, "getTransactionStatus", trackingId);
      return result;
    } catch (error) {
      this.logger.error(`Error obteniendo estado de transacciÃ³n: ${error.message}`, error.stack, WebpayService.name, "getTransactionStatus", trackingId);
      throw new InternalServerErrorException('Error getting Webpay transaction status');
    }
  }

  async getTransactionFromDB(token: string, trackingId:string): Promise<TransactionDocument> {
    try {
      this.logger.log(`Obteniendo transacciÃ³n desde la base de datos`, WebpayService.name, "getTransactionFromDB", trackingId);
      const transaction =await this.transactionModel.findOne({ token });

      this.logger.log(`Transaction found: ${JSON.stringify(transaction)}`, WebpayService.name, "getTransactionFromDB", trackingId);
      return transaction;
    } catch (error) {
      this.logger.error(`Error obtiendo transacciÃ³n desde la base de datos: ${error.message}`, error.stack, WebpayService.name, "getTransactionFromDB", trackingId);
      throw new InternalServerErrorException('Error getting Webpay transaction from DB');
    }
  }

}