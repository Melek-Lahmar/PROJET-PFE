import '../../models/delivery.dart';

class PickConflictException implements Exception {
  const PickConflictException();

  @override
  String toString() => 'PickConflictException';
}

abstract class DeliveriesRepository {
  Future<List<Delivery>> fetchNewOrders();
  Future<List<Delivery>> fetchMyOrders();
  Future<void> pick(String doPiece);

  Future<void> setStatus({
    required String doPiece,
    required int statut,
    String? motif,
    String? noteLivreur,
    DateTime? dateReplanification,
  });

  Future<BatchStatusResult> setStatusBatch({
    required List<String> doPieces,
    required int statut,
    String? motif,
    String? noteLivreur,
    String? apiStatusOverride,
  });
}

class BatchStatusResult {
  final int updated;
  final List<String> updatedPieces;
  final List<String> skippedPieces;
  final List<String> notFoundPieces;

  const BatchStatusResult({
    required this.updated,
    required this.updatedPieces,
    required this.skippedPieces,
    required this.notFoundPieces,
  });
}