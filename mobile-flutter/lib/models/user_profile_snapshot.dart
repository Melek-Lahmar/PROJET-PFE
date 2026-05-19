class UserProfileSnapshot {
  final String? fullName;
  final String? phone;
  final String? address;
  final String? addressComplement;
  final String? postalCode;
  final String? country;
  final String? delegation;
  final String? governorate;
  final String? companyName;
  final String? taxId;
  final String? sageClientCode;

  const UserProfileSnapshot({
    this.fullName,
    this.phone,
    this.address,
    this.addressComplement,
    this.postalCode,
    this.country,
    this.delegation,
    this.governorate,
    this.companyName,
    this.taxId,
    this.sageClientCode,
  });

  factory UserProfileSnapshot.fromMap(Map<String, dynamic> map) {
    String? str(dynamic value) {
      if (value == null) return null;
      final raw = value.toString().trim();
      return raw.isEmpty ? null : raw;
    }

    return UserProfileSnapshot(
      fullName: str(map['nomComplet']),
      phone: str(map['telephone']),
      address: str(map['adresse']),
      addressComplement: str(map['adresseComplementaire']),
      postalCode: str(map['codePostal']),
      country: str(map['pays']),
      delegation: str(map['delegation']),
      governorate: str(map['gouvernorat']),
      companyName: str(map['nomSociete']),
      taxId: str(map['matriculeFiscal']),
      sageClientCode: str(map['codeClientSage']),
    );
  }

  String? get displayName {
    if (fullName != null && fullName!.isNotEmpty) return fullName;
    if (companyName != null && companyName!.isNotEmpty) return companyName;
    return null;
  }

  String get compactAddress {
    final parts = <String>[
      if (address != null && address!.isNotEmpty) address!,
      if (addressComplement != null && addressComplement!.isNotEmpty)
        addressComplement!,
      if (delegation != null && delegation!.isNotEmpty) delegation!,
      if (governorate != null && governorate!.isNotEmpty) governorate!,
      if (postalCode != null && postalCode!.isNotEmpty) postalCode!,
      if (country != null && country!.isNotEmpty) country!,
    ];

    if (parts.isEmpty) return '--';
    return parts.join(', ');
  }
}
