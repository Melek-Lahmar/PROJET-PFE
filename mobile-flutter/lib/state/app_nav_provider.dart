import 'package:flutter/foundation.dart';

class AppNavProvider extends ChangeNotifier {
  int _index = 0;
  int get index => _index;

  void setIndex(int i) {
    if (_index == i) return;
    _index = i;
    notifyListeners();
  }

  void goToNew() => setIndex(0);
  void goToMy() => setIndex(1);
  void goToMap() => setIndex(2);
}