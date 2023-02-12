import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeHeaderComponent } from './home-header/home-header.component';
import { AddTeamComponent } from './add-team/add-team.component';
import { TeamMatchesComponent } from './team-matches/team-matches.component';

@NgModule({
  declarations: [
    AppComponent,
    HomeHeaderComponent,
    AddTeamComponent,
    TeamMatchesComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NgbModule,
    RouterModule.forRoot([
      {}
    ])
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
