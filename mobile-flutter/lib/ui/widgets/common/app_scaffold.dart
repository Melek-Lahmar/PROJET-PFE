import 'package:flutter/material.dart';
import 'package:projet_pfe_flutter/core/theme/app_spacing.dart';
import 'app_app_bar.dart';

class AppScaffold extends StatelessWidget {
  final String? title;
  final Widget body;
  final List<Widget>? actions;
  final Widget? floatingActionButton;
  final Widget? bottomNavigationBar;
  final Widget? drawer;
  final bool safeArea;
  final bool padded;
  final EdgeInsetsGeometry? padding;
  final PreferredSizeWidget? appBar;

  const AppScaffold({
    super.key,
    this.title,
    required this.body,
    this.actions,
    this.floatingActionButton,
    this.bottomNavigationBar,
    this.drawer,
    this.safeArea = true,
    this.padded = true,
    this.padding,
    this.appBar,
  });

  @override
  Widget build(BuildContext context) {
    Widget content = body;

    if (padded) {
      content = Padding(
        padding: padding ??
            const EdgeInsets.all(AppSpacing.screenPadding),
        child: content,
      );
    }

    if (safeArea) {
      content = SafeArea(child: content);
    }

    return Scaffold(
      appBar: appBar ??
          (title != null
              ? AppAppBar(
            title: title!,
            actions: actions,
          )
              : null),
      drawer: drawer,
      body: content,
      floatingActionButton: floatingActionButton,
      bottomNavigationBar: bottomNavigationBar,
    );
  }
}