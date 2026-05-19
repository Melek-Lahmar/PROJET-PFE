import 'package:flutter/material.dart';

import '../../../models/client_claim.dart';
import 'client_claim_status_badge.dart';

class ClientClaimCard extends StatelessWidget {
  final ClientClaim claim;
  final VoidCallback? onTap;

  const ClientClaimCard({super.key, required this.claim, this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      claim.codeReclamation,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                  ),
                  ClientClaimStatusBadge(status: claim.statut),
                ],
              ),
              const SizedBox(height: 8),
              Text('Colis : ${claim.doPiece}'),
              const SizedBox(height: 6),
              Text('Motif : ${claim.motif}'),
              const SizedBox(height: 6),
              Text(
                claim.description,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 12,
                runSpacing: 8,
                children: [
                  Text('Tentatives : ${claim.tentativesCount}'),
                  Text('Créée : ${_fmt(claim.createdAt)}'),
                  if ((claim.assignedToDisplay ?? '').trim().isNotEmpty)
                    Text('Affectée : ${claim.assignedToDisplay}'),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _fmt(DateTime value) {
    final d = value;
    return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')} ${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
  }
}
